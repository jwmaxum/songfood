-- B2B-04: additive, service-only transactional inquiry/CRM/quote history.
BEGIN;
ALTER TABLE public.commercial_inquiries
 ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.user_profiles(id),
 ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 ADD COLUMN IF NOT EXISTS requested_loading_port text,
 ADD COLUMN IF NOT EXISTS desired_ship_date date,
 ADD COLUMN IF NOT EXISTS required_documents jsonb NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS b2b_inquiry_assigned ON public.commercial_inquiries(assigned_to,created_at DESC);

CREATE TABLE IF NOT EXISTS public.b2b_inquiry_requests(
 scope_hash text NOT NULL CHECK(length(scope_hash)=64), request_key uuid NOT NULL,
 request_hash text NOT NULL CHECK(length(request_hash)=64),
 inquiry_id uuid NOT NULL REFERENCES public.commercial_inquiries(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(scope_hash,request_key)
);
CREATE TABLE IF NOT EXISTS public.b2b_inquiry_activities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES public.commercial_inquiries(id),
 actor_id uuid REFERENCES public.user_profiles(id), event text NOT NULL,
 visibility text NOT NULL CHECK(visibility IN ('internal','customer')),
 message text NOT NULL DEFAULT '', details jsonb NOT NULL DEFAULT '{}',
 request_key uuid, request_hash text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(inquiry_id,request_key)
);
CREATE INDEX IF NOT EXISTS b2b_activity_inquiry ON public.b2b_inquiry_activities(inquiry_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.b2b_quote_drafts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES public.commercial_inquiries(id),
 version integer NOT NULL CHECK(version>0), supersedes_id uuid REFERENCES public.b2b_quote_drafts(id),
 snapshot jsonb NOT NULL CHECK(snapshot->>'kind'='quotation_draft'),
 created_by uuid NOT NULL REFERENCES public.user_profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 request_key uuid NOT NULL, request_hash text NOT NULL CHECK(length(request_hash)=64),
 UNIQUE(inquiry_id,version), UNIQUE(inquiry_id,request_key)
);
CREATE TABLE IF NOT EXISTS public.b2b_notification_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES public.commercial_inquiries(id),
 activity_id uuid NOT NULL UNIQUE REFERENCES public.b2b_inquiry_activities(id),
 channel text NOT NULL DEFAULT 'test_inbox' CHECK(channel='test_inbox'),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','failed','delivered')),
 attempts integer NOT NULL DEFAULT 0, last_error text, delivered_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.b2b_notification_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL REFERENCES public.b2b_notification_outbox(id),
 actor_id uuid NOT NULL REFERENCES public.user_profiles(id), attempt integer NOT NULL,
 result text NOT NULL CHECK(result IN ('failed','delivered')), message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notification_id,attempt)
);
CREATE TABLE IF NOT EXISTS public.b2b_notification_test_inbox(
 notification_id uuid PRIMARY KEY REFERENCES public.b2b_notification_outbox(id),
 payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_inquiry_requests','b2b_inquiry_activities','b2b_quote_drafts','b2b_notification_outbox','b2b_notification_attempts','b2b_notification_test_inbox'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_crm_immutable() RETURNS trigger
 LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'CRM history is immutable'; END $$;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_inquiry_requests','b2b_inquiry_activities','b2b_quote_drafts','b2b_notification_attempts','b2b_notification_test_inbox'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS b2b_crm_immutable ON public.%I',t);
  EXECUTE format('CREATE TRIGGER b2b_crm_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_submit_inquiry(p_scope text,p_key uuid,p_hash text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old b2b_inquiry_requests; r commercial_inquiries; a uuid; item jsonb;
BEGIN
 IF length(p_scope)<>64 OR length(p_hash)<>64 THEN RAISE EXCEPTION 'invalid request' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_scope||p_key::text,0));
 SELECT * INTO old FROM b2b_inquiry_requests WHERE scope_hash=p_scope AND request_key=p_key;
 IF FOUND THEN
  IF old.request_hash<>p_hash THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('id',old.inquiry_id,'replayed',true);
 END IF;
 r:=jsonb_populate_record(NULL::commercial_inquiries,p_data);
 IF r.kind NOT IN ('export_rfq','domestic_wholesale') OR length(trim(r.contact_name))<1 OR length(trim(r.email))<3
  THEN RAISE EXCEPTION 'invalid inquiry' USING ERRCODE='22023'; END IF;
 IF r.company_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM company_members m JOIN companies c ON c.id=m.company_id
  WHERE m.user_id=r.submitted_by AND m.company_id=r.company_id AND m.status='active' AND c.status='approved')
  THEN RAISE EXCEPTION 'invalid company scope' USING ERRCODE='42501'; END IF;
 IF r.kind='export_rfq' THEN
  IF jsonb_typeof(r.items)<>'array' OR jsonb_array_length(r.items) NOT BETWEEN 1 AND 100
   THEN RAISE EXCEPTION 'invalid products' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(r.items) LOOP
   IF NOT EXISTS(SELECT 1 FROM products WHERE id=item->>'product_id') OR (item->>'quantity_cartons')!~'^[0-9]+$'
    OR (item->>'quantity_cartons')::numeric NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'invalid product quantity' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF (SELECT count(*) FROM jsonb_array_elements(r.items))<>(SELECT count(DISTINCT value->>'product_id') FROM jsonb_array_elements(r.items))
   THEN RAISE EXCEPTION 'duplicate products' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO commercial_inquiries(kind,company,contact_name,email,phone,business_type,business_registration_no,country,
 destination_port,incoterms,estimated_monthly_volume,items,notes,company_id,submitted_by,requested_loading_port,desired_ship_date,required_documents)
 VALUES(r.kind,r.company,r.contact_name,r.email,r.phone,r.business_type,r.business_registration_no,r.country,
 r.destination_port,r.incoterms,r.estimated_monthly_volume,coalesce(r.items,'[]'),r.notes,r.company_id,r.submitted_by,
 r.requested_loading_port,r.desired_ship_date,coalesce(r.required_documents,'[]')) RETURNING * INTO r;
 INSERT INTO b2b_inquiry_requests(scope_hash,request_key,request_hash,inquiry_id) VALUES(p_scope,p_key,p_hash,r.id);
 INSERT INTO b2b_inquiry_activities(inquiry_id,event,visibility,message)
 VALUES(r.id,'received','customer','문의가 접수되었습니다. / Request received.') RETURNING id INTO a;
 INSERT INTO b2b_notification_outbox(inquiry_id,activity_id) VALUES(r.id,a);
 RETURN jsonb_build_object('id',r.id,'replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.b2b_crm_change(p_actor uuid,p_id uuid,p_expected integer,p_key uuid,p_hash text,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r commercial_inquiries; old b2b_inquiry_activities; a uuid; msg text; visible text:='internal'; details jsonb:='{}'; assignee uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role IN ('admin','inquiry_staff'))
  THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM commercial_inquiries WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO old FROM b2b_inquiry_activities WHERE inquiry_id=p_id AND request_key=p_key;
 IF FOUND THEN
  IF old.actor_id<>p_actor OR old.request_hash<>p_hash THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('id',p_id,'replayed',true,'revision',r.revision);
 END IF;
 IF r.revision<>p_expected THEN RAISE EXCEPTION 'stale revision' USING ERRCODE='40001'; END IF;
 IF p_action='status' THEN
  IF p_data->>'status' NOT IN ('new','reviewing','responded','closed') OR p_data->>'status' IS NULL THEN RAISE EXCEPTION 'invalid status' USING ERRCODE='22023'; END IF;
  details:=jsonb_build_object('from',r.status,'to',p_data->>'status');
  UPDATE commercial_inquiries SET status=p_data->>'status' WHERE id=p_id;
  msg:=p_data->>'message';visible:='customer';
 ELSIF p_action='assign' THEN
  assignee:=nullif(p_data->>'assigned_to','')::uuid;
  IF assignee IS NOT NULL AND NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=assignee AND status='active' AND role IN ('admin','inquiry_staff'))
   THEN RAISE EXCEPTION 'invalid assignee' USING ERRCODE='22023'; END IF;
  details:=jsonb_build_object('from',r.assigned_to,'to',assignee);
  UPDATE commercial_inquiries SET assigned_to=assignee WHERE id=p_id;
  msg:='담당자 배정 변경';
 ELSIF p_action IN ('note','reply') THEN
  msg:=p_data->>'message';
  IF msg IS NULL OR length(trim(msg)) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'invalid message' USING ERRCODE='22023'; END IF;
  IF p_action='reply' THEN visible:='customer'; END IF;
 ELSE RAISE EXCEPTION 'unknown action' USING ERRCODE='22023';
 END IF;
 UPDATE commercial_inquiries SET revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO r;
 INSERT INTO b2b_inquiry_activities(inquiry_id,actor_id,event,visibility,message,details,request_key,request_hash)
 VALUES(p_id,p_actor,p_action,visible,coalesce(msg,''),details,p_key,p_hash) RETURNING id INTO a;
 IF visible='customer' THEN INSERT INTO b2b_notification_outbox(inquiry_id,activity_id) VALUES(p_id,a); END IF;
 RETURN jsonb_build_object('id',p_id,'revision',r.revision,'replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.b2b_save_quote_draft(p_actor uuid,p_id uuid,p_expected integer,p_base uuid,p_key uuid,p_hash text,p_snapshot jsonb)
RETURNS public.b2b_quote_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r commercial_inquiries; q b2b_quote_drafts; last_id uuid; next_version integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role IN ('admin','inquiry_staff'))
  THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM commercial_inquiries WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO q FROM b2b_quote_drafts WHERE inquiry_id=p_id AND request_key=p_key;
 IF FOUND THEN
  IF q.created_by<>p_actor OR q.request_hash<>p_hash THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505'; END IF;
  RETURN q;
 END IF;
 IF r.revision<>p_expected THEN RAISE EXCEPTION 'stale revision' USING ERRCODE='40001'; END IF;
 IF r.kind<>'export_rfq' OR p_snapshot->>'kind' IS DISTINCT FROM 'quotation_draft' OR p_snapshot->>'inquiry_id' IS DISTINCT FROM p_id::text
  THEN RAISE EXCEPTION 'invalid quote' USING ERRCODE='22023'; END IF;
 SELECT id,version+1 INTO last_id,next_version FROM b2b_quote_drafts WHERE inquiry_id=p_id ORDER BY version DESC LIMIT 1;
 IF last_id IS DISTINCT FROM p_base THEN RAISE EXCEPTION 'stale quote base' USING ERRCODE='40001'; END IF;
 INSERT INTO b2b_quote_drafts(inquiry_id,version,supersedes_id,snapshot,created_by,request_key,request_hash)
 VALUES(p_id,coalesce(next_version,1),p_base,p_snapshot,p_actor,p_key,p_hash) RETURNING * INTO q;
 UPDATE commercial_inquiries SET revision=revision+1,updated_at=now() WHERE id=p_id;
 INSERT INTO b2b_inquiry_activities(inquiry_id,actor_id,event,visibility,message,details)
 VALUES(p_id,p_actor,'quote_draft','internal','견적 초안 버전 저장',jsonb_build_object('quote_id',q.id,'version',q.version));
 RETURN q;
END $$;

-- Only an internal test inbox is supported in this stage. No commercial email is sent.
CREATE OR REPLACE FUNCTION public.b2b_deliver_test_notification(p_actor uuid,p_id uuid,p_fail boolean DEFAULT false)
RETURNS public.b2b_notification_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r b2b_notification_outbox;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role IN ('admin','inquiry_staff'))
  THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM b2b_notification_outbox WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 IF r.status='delivered' THEN RETURN r; END IF;
 IF p_fail THEN
  UPDATE b2b_notification_outbox SET attempts=attempts+1,status='failed',last_error='TEST_DELIVERY_FAILURE' WHERE id=p_id RETURNING * INTO r;
 ELSE
  INSERT INTO b2b_notification_test_inbox(notification_id,payload)
   VALUES(r.id,jsonb_build_object('inquiry_id',r.inquiry_id,'activity_id',r.activity_id,'test_only',true)) ON CONFLICT DO NOTHING;
  UPDATE b2b_notification_outbox SET attempts=attempts+1,status='delivered',last_error=NULL,delivered_at=now() WHERE id=p_id RETURNING * INTO r;
 END IF;
 INSERT INTO b2b_notification_attempts(notification_id,actor_id,attempt,result,message)
 VALUES(r.id,p_actor,r.attempts,r.status,CASE WHEN p_fail THEN 'Internal test failure' ELSE 'Delivered to internal test inbox; no email sent' END);
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.b2b_crm_immutable() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_submit_inquiry(text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_crm_change(uuid,uuid,integer,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_save_quote_draft(uuid,uuid,integer,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_deliver_test_notification(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_submit_inquiry(text,uuid,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_crm_change(uuid,uuid,integer,uuid,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_save_quote_draft(uuid,uuid,integer,uuid,uuid,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_deliver_test_notification(uuid,uuid,boolean) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261003090000_b2b_crm_quotes') ON CONFLICT DO NOTHING;
COMMIT;
