BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.b2b_pi_number_seq;
REVOKE ALL ON SEQUENCE public.b2b_pi_number_seq FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.b2b_pi_settings(
 id boolean PRIMARY KEY DEFAULT true CHECK(id),revision integer NOT NULL DEFAULT 1,data jsonb NOT NULL,
 updated_by uuid NOT NULL REFERENCES public.user_profiles(id),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.b2b_pi_documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL UNIQUE,
 inquiry_id uuid NOT NULL REFERENCES public.commercial_inquiries(id),quote_id uuid NOT NULL REFERENCES public.b2b_quote_drafts(id),
 version integer NOT NULL,supersedes_id uuid REFERENCES public.b2b_pi_documents(id),snapshot jsonb NOT NULL CHECK(snapshot->>'kind'='proforma_invoice'),
 status text NOT NULL DEFAULT 'preparing' CHECK(status IN('preparing','issued','superseded','cancelled')),
 created_by uuid NOT NULL REFERENCES public.user_profiles(id),created_at timestamptz NOT NULL DEFAULT now(),issued_at timestamptz,
 accepted_at timestamptz,accepted_by uuid,change_requested_at timestamptz,
 pdf_path text,pdf_sha256 text,pdf_bytes integer,
 request_key uuid NOT NULL,request_hash text NOT NULL CHECK(length(request_hash)=64),
 UNIQUE(inquiry_id,version),UNIQUE(inquiry_id,request_key),
 CHECK((status='preparing' OR status='cancelled') OR (pdf_path IS NOT NULL AND length(pdf_sha256)=64 AND pdf_bytes>0 AND issued_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS b2b_pi_one_preparing ON public.b2b_pi_documents(inquiry_id) WHERE status='preparing';
CREATE TABLE IF NOT EXISTS public.b2b_pi_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_id uuid REFERENCES public.b2b_pi_documents(id),actor_id uuid NOT NULL,
 event text NOT NULL,message text NOT NULL DEFAULT '',request_key uuid,request_hash text,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(document_id,actor_id,request_key)
);
CREATE INDEX IF NOT EXISTS b2b_pi_inquiry ON public.b2b_pi_documents(inquiry_id,version DESC);
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_pi_settings','b2b_pi_documents','b2b_pi_events'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_pi_content_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PI history is immutable'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','issued_at','accepted_at','accepted_by','change_requested_at','pdf_path','pdf_sha256','pdf_bytes']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['status','issued_at','accepted_at','accepted_by','change_requested_at','pdf_path','pdf_sha256','pdf_bytes'])
 THEN RAISE EXCEPTION 'PI content is immutable'; END IF;
 IF OLD.pdf_path IS NOT NULL AND (NEW.pdf_path,NEW.pdf_sha256,NEW.pdf_bytes,NEW.issued_at) IS DISTINCT FROM (OLD.pdf_path,OLD.pdf_sha256,OLD.pdf_bytes,OLD.issued_at)
 THEN RAISE EXCEPTION 'PI file is immutable'; END IF;
 IF OLD.accepted_at IS NOT NULL AND (NEW.accepted_at,NEW.accepted_by) IS DISTINCT FROM (OLD.accepted_at,OLD.accepted_by)
 THEN RAISE EXCEPTION 'PI acceptance is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS b2b_pi_content_guard ON public.b2b_pi_documents;
CREATE TRIGGER b2b_pi_content_guard BEFORE UPDATE OR DELETE ON public.b2b_pi_documents FOR EACH ROW EXECUTE FUNCTION public.b2b_pi_content_guard();
DROP TRIGGER IF EXISTS b2b_pi_events_immutable ON public.b2b_pi_events;
CREATE TRIGGER b2b_pi_events_immutable BEFORE UPDATE OR DELETE ON public.b2b_pi_events FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();

CREATE OR REPLACE FUNCTION public.b2b_pi_save_settings(p_actor uuid,p_expected integer,p_data jsonb)
RETURNS public.b2b_pi_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r b2b_pi_settings;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('b2b_pi_settings',0));
 SELECT * INTO r FROM b2b_pi_settings WHERE id=true;
 IF coalesce(r.revision,0)<>p_expected THEN RAISE EXCEPTION 'stale settings' USING ERRCODE='40001'; END IF;
 INSERT INTO b2b_pi_settings(id,revision,data,updated_by) VALUES(true,1,p_data,p_actor)
 ON CONFLICT(id) DO UPDATE SET revision=b2b_pi_settings.revision+1,data=EXCLUDED.data,updated_by=p_actor,updated_at=now() RETURNING * INTO r;
 INSERT INTO b2b_pi_events(actor_id,event,message) VALUES(p_actor,'settings','PI seller and payment details changed');
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_pi_prepare(p_actor uuid,p_inquiry uuid,p_quote uuid,p_expected integer,p_base uuid,p_key uuid,p_hash text,p_snapshot jsonb)
RETURNS public.b2b_pi_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r commercial_inquiries; q b2b_quote_drafts; d b2b_pi_documents; previous b2b_pi_documents; latest uuid; v integer;line jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM commercial_inquiries WHERE id=p_inquiry FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'inquiry not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO d FROM b2b_pi_documents WHERE inquiry_id=p_inquiry AND request_key=p_key;
 IF FOUND THEN
  IF d.created_by<>p_actor OR d.request_hash<>p_hash THEN RAISE EXCEPTION 'request conflict' USING ERRCODE='23505'; END IF;
  RETURN d;
 END IF;
 IF r.submitted_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customer_accounts WHERE id=r.submitted_by AND status='active') THEN RAISE EXCEPTION 'buyer inactive' USING ERRCODE='42501';END IF;
 IF r.company_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM companies c JOIN company_members m ON m.company_id=c.id WHERE c.id=r.company_id AND c.status='approved' AND m.user_id=r.submitted_by AND m.status='active') THEN RAISE EXCEPTION 'membership inactive' USING ERRCODE='42501';END IF;
 IF r.revision<>p_expected THEN RAISE EXCEPTION 'stale inquiry' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM b2b_pi_documents WHERE inquiry_id=p_inquiry AND status='preparing') THEN RAISE EXCEPTION 'resume pending document' USING ERRCODE='40001'; END IF;
 SELECT * INTO q FROM b2b_quote_drafts WHERE inquiry_id=p_inquiry ORDER BY version DESC LIMIT 1;
 IF q.id IS DISTINCT FROM p_quote OR q.snapshot->'issues'<>'[]'::jsonb OR (q.snapshot->>'valid_until')::timestamptz<=now()
 THEN RAISE EXCEPTION 'quote review required' USING ERRCODE='22023'; END IF;
 IF p_snapshot->>'kind' IS DISTINCT FROM 'proforma_invoice' OR (p_snapshot->>'valid_until')::timestamptz<=now()
 OR (p_snapshot->>'valid_until')::timestamptz>(q.snapshot->>'valid_until')::timestamptz
 OR (p_snapshot->>'total_minor')::bigint IS DISTINCT FROM (q.snapshot->>'proposed_total_minor')::bigint
 THEN RAISE EXCEPTION 'invalid snapshot' USING ERRCODE='22023'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(q.snapshot->'lines') LOOP
  IF NOT EXISTS(SELECT 1 FROM b2b_price_revisions WHERE id=(line->'price_source'->>'id')::uuid AND status='approved' AND valid_until>now())
  THEN RAISE EXCEPTION 'price expired' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM b2b_exchange_rates WHERE id=(q.snapshot->'exchange_rate'->>'id')::uuid AND valid_until>now())
 THEN RAISE EXCEPTION 'rate expired' USING ERRCODE='22023'; END IF;
 SELECT * INTO previous FROM b2b_pi_documents WHERE inquiry_id=p_inquiry AND status='issued' ORDER BY version DESC LIMIT 1;
 IF previous.id IS DISTINCT FROM p_base THEN RAISE EXCEPTION 'stale PI base' USING ERRCODE='40001'; END IF;
 IF previous.accepted_at IS NOT NULL AND (previous.change_requested_at IS NULL OR previous.change_requested_at<previous.accepted_at)
 THEN RAISE EXCEPTION 'accepted terms require buyer revision request' USING ERRCODE='40001'; END IF;
 SELECT coalesce(max(version),0)+1 INTO v FROM b2b_pi_documents WHERE inquiry_id=p_inquiry;
 INSERT INTO b2b_pi_documents(number,inquiry_id,quote_id,version,supersedes_id,snapshot,created_by,request_key,request_hash)
 VALUES('SGF-PI-'||to_char(now(),'YYYY')||'-'||lpad(nextval('b2b_pi_number_seq')::text,8,'0'),p_inquiry,p_quote,v,p_base,p_snapshot,p_actor,p_key,p_hash) RETURNING * INTO d;
 UPDATE commercial_inquiries SET revision=revision+1,updated_at=now() WHERE id=p_inquiry;
 INSERT INTO b2b_pi_events(document_id,actor_id,event,message) VALUES(d.id,p_actor,'prepared',p_snapshot->>'change_reason');
 RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_pi_finish(p_actor uuid,p_id uuid,p_path text,p_sha text,p_bytes integer,p_cancel boolean DEFAULT false)
RETURNS public.b2b_pi_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d b2b_pi_documents;r commercial_inquiries; previous b2b_pi_documents;a uuid;q b2b_quote_drafts;line jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM b2b_pi_documents WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO r FROM commercial_inquiries WHERE id=d.inquiry_id FOR UPDATE;
 SELECT * INTO d FROM b2b_pi_documents WHERE id=p_id FOR UPDATE;
 IF d.status<>'preparing' THEN
  IF p_cancel OR (d.pdf_path=p_path AND d.pdf_sha256=p_sha AND d.pdf_bytes=p_bytes) THEN RETURN d; END IF;
  RAISE EXCEPTION 'already finalized' USING ERRCODE='40001';
 END IF;
 IF p_cancel THEN
  UPDATE b2b_pi_documents SET status='cancelled' WHERE id=p_id RETURNING * INTO d;
  INSERT INTO b2b_pi_events(document_id,actor_id,event,message) VALUES(d.id,p_actor,'cancelled','Unissued preparation cancelled; number retained');
  RETURN d;
 END IF;
 IF r.submitted_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customer_accounts WHERE id=r.submitted_by AND status='active') THEN RAISE EXCEPTION 'buyer inactive' USING ERRCODE='42501';END IF;
 IF r.company_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM companies c JOIN company_members m ON m.company_id=c.id WHERE c.id=r.company_id AND c.status='approved' AND m.user_id=r.submitted_by AND m.status='active') THEN RAISE EXCEPTION 'membership inactive' USING ERRCODE='42501';END IF;
 IF d.quote_id IS DISTINCT FROM (SELECT id FROM b2b_quote_drafts WHERE inquiry_id=d.inquiry_id ORDER BY version DESC LIMIT 1) THEN RAISE EXCEPTION 'newer quote exists' USING ERRCODE='40001';END IF;
 IF p_path IS DISTINCT FROM 'pi/'||p_id::text||'.pdf' OR p_sha!~'^[0-9a-f]{64}$' OR p_bytes NOT BETWEEN 1 AND 10485760 THEN RAISE EXCEPTION 'invalid PDF' USING ERRCODE='22023'; END IF;
 IF (d.snapshot->>'valid_until')::timestamptz<=now() THEN RAISE EXCEPTION 'expired before issue' USING ERRCODE='22023'; END IF;
 SELECT * INTO q FROM b2b_quote_drafts WHERE id=d.quote_id;
 FOR line IN SELECT value FROM jsonb_array_elements(q.snapshot->'lines') LOOP
  IF NOT EXISTS(SELECT 1 FROM b2b_price_revisions WHERE id=(line->'price_source'->>'id')::uuid AND status='approved' AND valid_until>now())
  THEN RAISE EXCEPTION 'price unavailable' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM b2b_exchange_rates WHERE id=(q.snapshot->'exchange_rate'->>'id')::uuid AND valid_until>now()) THEN RAISE EXCEPTION 'rate expired' USING ERRCODE='22023'; END IF;
 SELECT * INTO previous FROM b2b_pi_documents WHERE inquiry_id=d.inquiry_id AND status='issued' ORDER BY version DESC LIMIT 1;
 IF previous.id IS DISTINCT FROM d.supersedes_id THEN RAISE EXCEPTION 'PI changed' USING ERRCODE='40001'; END IF;
 IF previous.accepted_at IS NOT NULL AND (previous.change_requested_at IS NULL OR previous.change_requested_at<previous.accepted_at) THEN RAISE EXCEPTION 'accepted in meantime' USING ERRCODE='40001'; END IF;
 IF previous.id IS NOT NULL AND previous.accepted_at IS NULL THEN UPDATE b2b_pi_documents SET status='superseded' WHERE id=previous.id; END IF;
 UPDATE b2b_pi_documents SET status='issued',issued_at=now(),pdf_path=p_path,pdf_sha256=p_sha,pdf_bytes=p_bytes WHERE id=p_id RETURNING * INTO d;
 INSERT INTO b2b_pi_events(document_id,actor_id,event,message) VALUES(d.id,p_actor,'issued','PDF stored and hash verified');
 INSERT INTO b2b_inquiry_activities(inquiry_id,actor_id,event,visibility,message,details)
 VALUES(d.inquiry_id,p_actor,'pi_issued','customer','Proforma Invoice issued: '||d.number||' v'||d.version,jsonb_build_object('pi_id',d.id)) RETURNING id INTO a;
 INSERT INTO b2b_notification_outbox(inquiry_id,activity_id) VALUES(d.inquiry_id,a);
 RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_pi_customer_action(p_actor uuid,p_id uuid,p_action text,p_message text,p_key uuid,p_hash text)
RETURNS public.b2b_pi_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d b2b_pi_documents;r commercial_inquiries;old b2b_pi_events;head uuid;a uuid;
BEGIN
 SELECT * INTO d FROM b2b_pi_documents WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO r FROM commercial_inquiries WHERE id=d.inquiry_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM customer_accounts WHERE id=p_actor AND status='active') OR NOT
 ((r.company_id IS NULL AND r.submitted_by IS NOT DISTINCT FROM p_actor) OR EXISTS(SELECT 1 FROM company_members m JOIN companies c ON c.id=m.company_id
 WHERE m.user_id=p_actor AND m.company_id=r.company_id AND m.status='active' AND c.status='approved'))
 THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO d FROM b2b_pi_documents WHERE id=p_id FOR UPDATE;
 IF d.status IN('preparing','cancelled') THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO old FROM b2b_pi_events WHERE document_id=p_id AND actor_id=p_actor AND request_key=p_key;
 IF FOUND THEN
  IF old.request_hash<>p_hash THEN RAISE EXCEPTION 'request conflict' USING ERRCODE='23505'; END IF;
  RETURN d;
 END IF;
 IF p_action IN('accept','request_changes') THEN
  SELECT id INTO head FROM b2b_pi_documents WHERE inquiry_id=r.id AND status='issued' ORDER BY version DESC LIMIT 1;
  IF d.status<>'issued' OR d.id IS DISTINCT FROM head THEN RAISE EXCEPTION 'superseded document' USING ERRCODE='40001'; END IF;
  IF p_action='accept' THEN
   IF d.accepted_at IS NULL THEN
    IF (d.snapshot->>'valid_until')::timestamptz<=now() OR d.change_requested_at IS NOT NULL THEN RAISE EXCEPTION 'expired or revision requested' USING ERRCODE='40001'; END IF;
    UPDATE b2b_pi_documents SET accepted_at=now(),accepted_by=p_actor WHERE id=p_id RETURNING * INTO d;
    UPDATE b2b_pi_documents SET status='superseded' WHERE inquiry_id=d.inquiry_id AND id<>d.id AND status='issued';
   END IF;
  ELSE
   IF length(trim(p_message)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'revision reason required' USING ERRCODE='22023'; END IF;
   UPDATE b2b_pi_documents SET change_requested_at=now() WHERE id=p_id RETURNING * INTO d;
  END IF;
 ELSIF p_action NOT IN('view','download') THEN RAISE EXCEPTION 'invalid action' USING ERRCODE='22023'; END IF;
 INSERT INTO b2b_pi_events(document_id,actor_id,event,message,request_key,request_hash) VALUES(p_id,p_actor,p_action,coalesce(p_message,''),p_key,p_hash);
 IF p_action IN('accept','request_changes') THEN
  INSERT INTO b2b_inquiry_activities(inquiry_id,event,visibility,message,details)
   VALUES(r.id,'pi_'||p_action,'customer',CASE WHEN p_action='accept' THEN 'Proforma Invoice accepted: '||d.number ELSE 'PI revision requested: '||p_message END,jsonb_build_object('pi_id',d.id)) RETURNING id INTO a;
  INSERT INTO b2b_notification_outbox(inquiry_id,activity_id) VALUES(r.id,a);
 END IF;
 RETURN d;
END $$;
DO $$ DECLARE sig text;BEGIN
 FOREACH sig IN ARRAY ARRAY['b2b_pi_content_guard()','b2b_pi_save_settings(uuid,integer,jsonb)','b2b_pi_prepare(uuid,uuid,uuid,integer,uuid,uuid,text,jsonb)',
 'b2b_pi_finish(uuid,uuid,text,text,integer,boolean)','b2b_pi_customer_action(uuid,uuid,text,text,uuid,text)'] LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION public.'||sig||' FROM PUBLIC,anon,authenticated';
 EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||sig||' TO service_role';
 END LOOP;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('b2b-proforma','b2b-proforma',false,10485760,ARRAY['application/pdf'])
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='b2b-proforma' AND public) THEN RAISE EXCEPTION 'PI bucket must be private'; END IF;END $$;
DROP POLICY IF EXISTS b2b_pi_private_objects ON storage.objects;
CREATE POLICY b2b_pi_private_objects ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING(bucket_id<>'b2b-proforma') WITH CHECK(bucket_id<>'b2b-proforma');
INSERT INTO public.b2b_schema_versions(id) VALUES('20261003150000_b2b_proforma') ON CONFLICT DO NOTHING;
COMMIT;
