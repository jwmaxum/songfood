-- B2B-10 actual email is separate from the historical internal test inbox.
BEGIN;
CREATE TABLE public.b2b_email_deliveries(
 notification_id uuid PRIMARY KEY REFERENCES public.b2b_notification_outbox(id),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN('queued','sending','accepted','failed','uncertain')),
 attempt integer NOT NULL DEFAULT 0, token uuid, request_key uuid, payload_hash text,
 lease_until timestamptz, last_code text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.b2b_email_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),notification_id uuid NOT NULL REFERENCES public.b2b_notification_outbox(id),
 actor_id uuid NOT NULL REFERENCES public.user_profiles(id),event text NOT NULL,
 attempt integer NOT NULL,code text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.b2b_mail_transport(
 id boolean PRIMARY KEY DEFAULT true CHECK(id),verified_at timestamptz,last_checked_at timestamptz,last_code text NOT NULL DEFAULT 'NOT_VERIFIED'
);
INSERT INTO public.b2b_mail_transport(id) VALUES(true);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_email_deliveries','b2b_email_events','b2b_mail_transport'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE TRIGGER b2b_email_events_immutable BEFORE UPDATE OR DELETE ON public.b2b_email_events FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();

CREATE FUNCTION public.b2b_mail_prepare(p_actor uuid,p_id uuid,p_action text DEFAULT 'preview',p_key uuid DEFAULT NULL,p_hash text DEFAULT NULL,p_reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n public.b2b_notification_outbox;i public.commercial_inquiries;a public.b2b_inquiry_activities;
 d public.b2b_email_deliveries;recipient text;payload jsonb;fingerprint text;staff_role text;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 SELECT role INTO staff_role FROM public.user_profiles WHERE id=p_actor AND status='active' AND role IN('admin','inquiry_staff');
 IF staff_role IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_action NOT IN('preview','send','reset') THEN RAISE EXCEPTION 'invalid action' USING ERRCODE='22023';END IF;
 SELECT * INTO n FROM public.b2b_notification_outbox WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing notification' USING ERRCODE='P0002';END IF;
 SELECT * INTO i FROM public.commercial_inquiries WHERE id=n.inquiry_id;
 SELECT * INTO a FROM public.b2b_inquiry_activities WHERE id=n.activity_id;
 -- Do not send to a free-form RFQ email. Only the currently verified account with document access.
 IF a.visibility<>'customer' OR i.submitted_by IS NULL OR NOT EXISTS(SELECT 1 FROM public.customer_accounts WHERE id=i.submitted_by AND status='active')
 OR (i.company_id IS NOT NULL AND (NOT EXISTS(SELECT 1 FROM public.companies WHERE id=i.company_id AND status='approved')
 OR NOT EXISTS(SELECT 1 FROM public.company_members WHERE company_id=i.company_id AND user_id=i.submitted_by AND status='active')))
 THEN RAISE EXCEPTION 'recipient not eligible' USING ERRCODE='22023';END IF;
 SELECT email INTO recipient FROM auth.users WHERE id=i.submitted_by AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<now());
 IF recipient IS NULL OR recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR recipient ~ E'[\r\n]' THEN RAISE EXCEPTION 'email not verified' USING ERRCODE='22023';END IF;
 payload:=jsonb_build_object('notification_id',n.id,'inquiry_id',i.id,'recipient',recipient,'event',a.event,'activity_id',a.id,'account_id',i.submitted_by,'company_id',i.company_id);
 fingerprint:=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
 INSERT INTO public.b2b_email_deliveries(notification_id) VALUES(p_id) ON CONFLICT DO NOTHING;
 SELECT * INTO d FROM public.b2b_email_deliveries WHERE notification_id=p_id FOR UPDATE;
 IF d.state='sending' AND d.lease_until<now() THEN
 UPDATE public.b2b_email_deliveries SET state='uncertain',last_code='LEASE_EXPIRED',updated_at=now() WHERE notification_id=p_id RETURNING * INTO d;
 INSERT INTO public.b2b_email_events(notification_id,actor_id,event,attempt,code) VALUES(p_id,p_actor,'uncertain',d.attempt,'LEASE_EXPIRED');
 END IF;
 IF p_action='reset' THEN
 IF staff_role<>'admin' THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501';END IF;
 IF d.state NOT IN('uncertain','failed') OR length(trim(p_reason)) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'review reason required' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_email_deliveries SET state='queued',token=NULL,request_key=NULL,lease_until=NULL,last_code=NULL,updated_at=now() WHERE notification_id=p_id RETURNING * INTO d;
 INSERT INTO public.b2b_email_events(notification_id,actor_id,event,attempt,code) VALUES(p_id,p_actor,'manual_reset',d.attempt,trim(p_reason));
 ELSIF p_action='send' THEN
 IF p_key IS NULL OR p_hash IS DISTINCT FROM fingerprint OR length(trim(p_reason)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'stale preview' USING ERRCODE='40001';END IF;
 IF d.request_key=p_key OR d.state='accepted' THEN RETURN jsonb_build_object('delivery',to_jsonb(d),'payload',payload,'hash',fingerprint,'claimed',false);END IF;
 IF d.state<>'queued' THEN RAISE EXCEPTION 'manual review required' USING ERRCODE='40001';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.b2b_mail_transport WHERE id=true AND verified_at>now()-interval '7 days' AND last_code='SMTP_VERIFIED') THEN RAISE EXCEPTION 'transport not verified' USING ERRCODE='55000';END IF;
 -- Serialize the shared daily cap across senders.
 PERFORM 1 FROM public.b2b_mail_transport WHERE id=true FOR UPDATE;
 IF (SELECT count(*) FROM public.b2b_email_events WHERE event='claimed' AND created_at>now()-interval '24 hours')>=50 THEN RAISE EXCEPTION 'daily mail cap' USING ERRCODE='54000';END IF;
 UPDATE public.b2b_email_deliveries SET state='sending',attempt=attempt+1,token=gen_random_uuid(),request_key=p_key,payload_hash=fingerprint,lease_until=now()+interval '2 minutes',last_code=NULL,updated_at=now() WHERE notification_id=p_id RETURNING * INTO d;
 INSERT INTO public.b2b_email_events(notification_id,actor_id,event,attempt,code) VALUES(p_id,p_actor,'claimed',d.attempt,trim(p_reason));
 END IF;
 RETURN jsonb_build_object('delivery',to_jsonb(d),'payload',payload,'hash',fingerprint,'claimed',p_action='send');
END $$;
CREATE FUNCTION public.b2b_mail_finish(p_actor uuid,p_id uuid,p_token uuid,p_result text,p_code text)
RETURNS public.b2b_email_deliveries LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.b2b_email_deliveries;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role IN('admin','inquiry_staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_result NOT IN('accepted','failed','uncertain') OR p_code NOT IN('SMTP_ACCEPTED','SMTP_AUTH_FAILED','SMTP_REJECTED','SEND_OUTCOME_UNKNOWN') THEN RAISE EXCEPTION 'invalid result' USING ERRCODE='22023';END IF;
 SELECT * INTO d FROM public.b2b_email_deliveries WHERE notification_id=p_id FOR UPDATE;
 IF d.token IS DISTINCT FROM p_token OR p_token IS NULL THEN RAISE EXCEPTION 'lease conflict' USING ERRCODE='40001';END IF;
 IF d.state<>'sending' THEN RETURN d;END IF;
 UPDATE public.b2b_email_deliveries SET state=p_result,last_code=p_code,lease_until=NULL,updated_at=now() WHERE notification_id=p_id RETURNING * INTO d;
 INSERT INTO public.b2b_email_events(notification_id,actor_id,event,attempt,code) VALUES(p_id,p_actor,p_result,d.attempt,p_code);
 RETURN d;
END $$;
CREATE FUNCTION public.b2b_mail_verify(p_actor uuid,p_ok boolean)
RETURNS public.b2b_mail_transport LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.b2b_mail_transport;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501';END IF;
 UPDATE public.b2b_mail_transport SET verified_at=CASE WHEN p_ok THEN now() ELSE NULL END,last_checked_at=now(),last_code=CASE WHEN p_ok THEN 'SMTP_VERIFIED' ELSE 'SMTP_VERIFY_FAILED' END WHERE id=true RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.b2b_mail_prepare(uuid,uuid,text,uuid,text,text),public.b2b_mail_finish(uuid,uuid,uuid,text,text),public.b2b_mail_verify(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_mail_prepare(uuid,uuid,text,uuid,text,text),public.b2b_mail_finish(uuid,uuid,uuid,text,text),public.b2b_mail_verify(uuid,boolean) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261004150000_b2b_customer_mail') ON CONFLICT DO NOTHING;
COMMIT;
