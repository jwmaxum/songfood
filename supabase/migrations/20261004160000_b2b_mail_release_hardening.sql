BEGIN;
ALTER TABLE public.b2b_mail_transport ADD COLUMN origin text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.b2b_mail_prepare(p_actor uuid,p_id uuid,p_action text DEFAULT 'preview',p_key uuid DEFAULT NULL,p_hash text DEFAULT NULL,p_reason text DEFAULT '')
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
 IF d.request_key=p_key OR d.state='accepted' THEN RETURN jsonb_build_object('origin',(SELECT origin FROM public.b2b_mail_transport WHERE id=true),'delivery',to_jsonb(d),'payload',payload,'hash',fingerprint,'claimed',false);END IF;
 IF d.state<>'queued' THEN RAISE EXCEPTION 'manual review required' USING ERRCODE='40001';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.b2b_mail_transport WHERE id=true AND verified_at>now()-interval '7 days' AND last_code='SMTP_VERIFIED') THEN RAISE EXCEPTION 'transport not verified' USING ERRCODE='55000';END IF;
 -- Serialize the shared daily cap across senders.
 PERFORM 1 FROM public.b2b_mail_transport WHERE id=true FOR UPDATE;
 IF (SELECT count(*) FROM public.b2b_email_events WHERE event='claimed' AND created_at>now()-interval '24 hours')>=50 THEN RAISE EXCEPTION 'daily mail cap' USING ERRCODE='54000';END IF;
 UPDATE public.b2b_email_deliveries SET state='sending',attempt=attempt+1,token=gen_random_uuid(),request_key=p_key,payload_hash=fingerprint,lease_until=now()+interval '2 minutes',last_code=NULL,updated_at=now() WHERE notification_id=p_id RETURNING * INTO d;
 INSERT INTO public.b2b_email_events(notification_id,actor_id,event,attempt,code) VALUES(p_id,p_actor,'claimed',d.attempt,trim(p_reason));
 END IF;
 RETURN jsonb_build_object('origin',(SELECT origin FROM public.b2b_mail_transport WHERE id=true),'delivery',to_jsonb(d),'payload',payload,'hash',fingerprint,'claimed',p_action='send');
END $$;

DROP FUNCTION public.b2b_mail_verify(uuid,boolean);
CREATE FUNCTION public.b2b_mail_verify(p_actor uuid,p_ok boolean,p_origin text)
RETURNS public.b2b_mail_transport LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.b2b_mail_transport;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501';END IF;
 IF p_ok AND (p_origin IS NULL OR p_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$') THEN RAISE EXCEPTION 'invalid origin' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_mail_transport SET origin=CASE WHEN p_ok THEN p_origin ELSE origin END,verified_at=CASE WHEN p_ok THEN now() ELSE NULL END,last_checked_at=now(),last_code=CASE WHEN p_ok THEN 'SMTP_VERIFIED' ELSE 'SMTP_VERIFY_FAILED' END WHERE id=true RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.b2b_mail_verify(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_mail_verify(uuid,boolean,text) TO service_role;
CREATE OR REPLACE FUNCTION public.b2b_guard_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE enabled boolean;item jsonb;facts jsonb;r public.b2b_product_releases;is_export boolean;
BEGIN
 SELECT p.enabled INTO enabled FROM public.b2b_release_policy p WHERE id=true FOR SHARE;
 IF enabled IS NULL THEN RAISE EXCEPTION 'release policy unavailable' USING ERRCODE='55000';END IF;
 IF NOT enabled THEN RETURN NEW;END IF;
 is_export:=TG_TABLE_NAME='b2b_pi_documents';
 LOCK TABLE public.b2b_price_revisions,public.b2b_price_lists IN SHARE MODE;
 FOR item IN SELECT value FROM jsonb_array_elements(CASE WHEN is_export THEN NEW.snapshot->'lines' ELSE jsonb_build_array(NEW.snapshot) END) ORDER BY value->>'product_id' LOOP
 PERFORM 1 FROM public.products WHERE id=item->>'product_id' FOR SHARE;
 SELECT * INTO r FROM public.b2b_product_releases WHERE product_id=item->>'product_id' FOR SHARE;
 facts:=public.b2b_release_facts(item->>'product_id');
 IF r.product_id IS NULL OR r.fingerprint IS DISTINCT FROM facts->>'fingerprint' OR (is_export AND (NOT r.export OR jsonb_array_length(facts->'export_issues')>0)) OR (NOT is_export AND (NOT r.domestic OR jsonb_array_length(facts->'domestic_issues')>0))
 THEN RAISE EXCEPTION 'product needs release review' USING ERRCODE='22023';END IF;
 IF is_export AND EXISTS(SELECT 1 FROM public.b2b_quote_drafts q CROSS JOIN LATERAL jsonb_array_elements(q.snapshot->'lines') line WHERE q.id=NEW.quote_id AND line->>'product_id'=item->>'product_id' AND NOT EXISTS(SELECT 1 FROM public.b2b_price_revisions r JOIN public.b2b_price_lists l ON l.id=r.price_list_id WHERE r.id=(line->'price_source'->>'id')::uuid AND l.active AND r.status='approved' AND r.valid_until>now() AND r.id=(SELECT newer.id FROM public.b2b_price_revisions newer WHERE newer.product_id=r.product_id AND newer.price_list_id=r.price_list_id AND newer.status='approved' AND newer.valid_from<=now() ORDER BY newer.version DESC LIMIT 1))) THEN RAISE EXCEPTION 'quote needs current price review' USING ERRCODE='40001';END IF;
 END LOOP;
 RETURN NEW;
END $$;

CREATE TRIGGER b2b_release_issue_guard BEFORE UPDATE OF status ON public.b2b_pi_documents FOR EACH ROW WHEN (OLD.status='preparing' AND NEW.status='issued') EXECUTE FUNCTION public.b2b_guard_release();
INSERT INTO public.b2b_schema_versions(id) VALUES('20261004160000_b2b_mail_release_hardening') ON CONFLICT DO NOTHING;
COMMIT;
