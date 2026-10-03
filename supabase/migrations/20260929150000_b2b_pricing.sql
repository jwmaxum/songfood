-- B2B-02 additive pricing schema. No existing product prices are overwritten or approved.
BEGIN;
CREATE TABLE IF NOT EXISTS public.b2b_price_lists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 scope text NOT NULL CHECK(scope IN ('common','personal','business','company')),
 company_id uuid REFERENCES public.companies(id), active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((scope='company')=(company_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS b2b_price_list_global_scope ON public.b2b_price_lists(scope) WHERE active AND company_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS b2b_price_list_company ON public.b2b_price_lists(company_id) WHERE active AND company_id IS NOT NULL;
INSERT INTO public.b2b_price_lists(id,name,scope) VALUES('00000000-0000-4000-8000-000000000201','기본 도매가격표','common') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.b2b_price_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id text NOT NULL REFERENCES public.products(id),
 price_list_id uuid NOT NULL REFERENCES public.b2b_price_lists(id), version integer NOT NULL CHECK(version>0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','rejected')),
 price_unit text CHECK(price_unit IN ('EA','BOX','CTN')),
 unit_price_krw numeric(12,2) CHECK(unit_price_krw>0), tax_code text CHECK(tax_code IN ('vat10','exempt')), vat_included boolean,
 ea_per_box integer CHECK(ea_per_box BETWEEN 1 AND 1000000),
 boxes_per_carton integer CHECK(boxes_per_carton BETWEEN 1 AND 1000000),
 ea_per_carton integer CHECK(ea_per_carton BETWEEN 1 AND 1000000),
 minimum_order_unit text CHECK(minimum_order_unit IN ('EA','BOX','CTN')),
 minimum_order_quantity integer CHECK(minimum_order_quantity BETWEEN 1 AND 1000000),
 export_moq_ctn integer CHECK(export_moq_ctn BETWEEN 1 AND 1000000), tiers jsonb NOT NULL DEFAULT '[]',
 valid_from timestamptz, valid_until timestamptz,
 fob_status text NOT NULL DEFAULT 'unreviewed' CHECK(fob_status IN ('unreviewed','included','adjustment_required')),
 loading_port text NOT NULL DEFAULT '', cost_review text NOT NULL DEFAULT '', review_source text NOT NULL DEFAULT '',
 change_reason text NOT NULL DEFAULT '', supersedes_id uuid REFERENCES public.b2b_price_revisions(id),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 approved_by uuid REFERENCES auth.users(id), approved_at timestamptz,
 UNIQUE(product_id,price_list_id,version),
 CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until>valid_from),
 CHECK(ea_per_box IS NULL OR boxes_per_carton IS NULL OR
   (ea_per_box::bigint*boxes_per_carton<=1000000 AND (ea_per_carton IS NULL OR ea_per_box::bigint*boxes_per_carton=ea_per_carton))),
 CHECK(jsonb_typeof(tiers)='array' AND jsonb_array_length(tiers)<=20)
);
CREATE INDEX IF NOT EXISTS b2b_price_lookup ON public.b2b_price_revisions(product_id,price_list_id,version DESC);
CREATE TABLE IF NOT EXISTS public.b2b_exchange_rates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), krw_per_usd numeric(14,6) NOT NULL CHECK(krw_per_usd>0),
 source text NOT NULL CHECK(length(source) BETWEEN 3 AND 1000),
 observed_at timestamptz NOT NULL, valid_until timestamptz NOT NULL CHECK(valid_until>observed_at),
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 1000),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(valid_until<=observed_at+interval '7 days')
);
CREATE TABLE IF NOT EXISTS public.b2b_pricing_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL, record_id uuid NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_price_lists','b2b_price_revisions','b2b_exchange_rates','b2b_pricing_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_pricing_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'pricing history is immutable'; END IF;
 IF TG_TABLE_NAME='b2b_price_revisions' AND OLD.status='draft'
  AND (to_jsonb(NEW)-ARRAY['status','approved_by','approved_at'])=(to_jsonb(OLD)-ARRAY['status','approved_by','approved_at'])
  THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'pricing history is immutable';
END $$;
DROP TRIGGER IF EXISTS b2b_price_immutable ON public.b2b_price_revisions;
CREATE TRIGGER b2b_price_immutable BEFORE UPDATE OR DELETE ON public.b2b_price_revisions FOR EACH ROW EXECUTE FUNCTION public.b2b_pricing_immutable();
DROP TRIGGER IF EXISTS b2b_rate_immutable ON public.b2b_exchange_rates;
CREATE TRIGGER b2b_rate_immutable BEFORE UPDATE OR DELETE ON public.b2b_exchange_rates FOR EACH ROW EXECUTE FUNCTION public.b2b_pricing_immutable();
DROP TRIGGER IF EXISTS b2b_pricing_audit_immutable ON public.b2b_pricing_audit;
CREATE TRIGGER b2b_pricing_audit_immutable BEFORE UPDATE OR DELETE ON public.b2b_pricing_audit FOR EACH ROW EXECUTE FUNCTION public.b2b_pricing_immutable();

CREATE OR REPLACE FUNCTION public.b2b_save_price_drafts(p_actor uuid,p_rows jsonb)
RETURNS SETOF public.b2b_price_revisions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; r b2b_price_revisions; next_version integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role IN ('admin','product_staff'))
  THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 200
  THEN RAISE EXCEPTION 'invalid batch' USING ERRCODE='22023'; END IF;
 LOCK TABLE b2b_price_revisions IN SHARE ROW EXCLUSIVE MODE;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  r := jsonb_populate_record(NULL::b2b_price_revisions,item);
  IF NOT EXISTS(SELECT 1 FROM b2b_price_lists WHERE id=r.price_list_id AND active)
   THEN RAISE EXCEPTION 'inactive price list' USING ERRCODE='22023'; END IF;
  IF r.supersedes_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM b2b_price_revisions
      WHERE id=r.supersedes_id AND product_id=r.product_id AND price_list_id=r.price_list_id AND status='approved')
   THEN RAISE EXCEPTION 'invalid base version' USING ERRCODE='22023'; END IF;
  SELECT coalesce(max(version),0)+1 INTO next_version FROM b2b_price_revisions WHERE product_id=r.product_id AND price_list_id=r.price_list_id;
  INSERT INTO b2b_price_revisions(product_id,price_list_id,version,price_unit,unit_price_krw,tax_code,vat_included,
   ea_per_box,boxes_per_carton,ea_per_carton,minimum_order_unit,minimum_order_quantity,export_moq_ctn,tiers,
   valid_from,valid_until,fob_status,loading_port,cost_review,review_source,change_reason,supersedes_id,created_by)
  VALUES(r.product_id,r.price_list_id,next_version,r.price_unit,r.unit_price_krw,r.tax_code,r.vat_included,
   r.ea_per_box,r.boxes_per_carton,r.ea_per_carton,r.minimum_order_unit,r.minimum_order_quantity,r.export_moq_ctn,coalesce(r.tiers,'[]'),
   r.valid_from,r.valid_until,coalesce(r.fob_status,'unreviewed'),coalesce(r.loading_port,''),coalesce(r.cost_review,''),
   coalesce(r.review_source,''),coalesce(r.change_reason,''),r.supersedes_id,p_actor) RETURNING * INTO r;
  INSERT INTO b2b_pricing_audit(actor_id,action,record_id,details) VALUES(p_actor,'draft_created',r.id,jsonb_build_object('base_version_id',r.supersedes_id,'reason',r.change_reason));
  RETURN NEXT r;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_approve_price(p_actor uuid,p_id uuid)
RETURNS public.b2b_price_revisions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r b2b_price_revisions; base_id uuid; tier jsonb; seen integer[]:='{}'; n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role='admin')
  THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 LOCK TABLE b2b_price_revisions IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO r FROM b2b_price_revisions WHERE id=p_id FOR UPDATE;
 IF r.id IS NULL OR r.status<>'draft' THEN RAISE EXCEPTION 'draft not available' USING ERRCODE='22023'; END IF;
 SELECT id INTO base_id FROM b2b_price_revisions WHERE product_id=r.product_id AND price_list_id=r.price_list_id AND status='approved' ORDER BY version DESC LIMIT 1;
 IF base_id IS DISTINCT FROM r.supersedes_id THEN RAISE EXCEPTION 'stale price version' USING ERRCODE='40001'; END IF;
 IF r.unit_price_krw IS NULL OR r.price_unit IS NULL OR r.tax_code IS NULL OR r.vat_included IS NULL
  OR r.minimum_order_unit IS NULL OR r.minimum_order_quantity IS NULL OR r.valid_from IS NULL OR r.valid_until IS NULL
  OR r.valid_until<=now() OR length(trim(r.review_source))<3 OR length(trim(r.change_reason))<3
  THEN RAISE EXCEPTION 'incomplete price review' USING ERRCODE='22023'; END IF;
 IF (r.price_unit='BOX' OR r.minimum_order_unit='BOX') AND r.ea_per_box IS NULL
  THEN RAISE EXCEPTION 'box conversion missing' USING ERRCODE='22023'; END IF;
 IF (r.price_unit='CTN' OR r.minimum_order_unit='CTN') AND r.ea_per_carton IS NULL AND (r.ea_per_box IS NULL OR r.boxes_per_carton IS NULL)
  THEN RAISE EXCEPTION 'carton conversion missing' USING ERRCODE='22023'; END IF;
 IF r.fob_status='included' AND (length(trim(r.cost_review))<3 OR length(trim(r.loading_port))<2)
  THEN RAISE EXCEPTION 'FOB review missing' USING ERRCODE='22023'; END IF;
 FOR tier IN SELECT value FROM jsonb_array_elements(r.tiers) LOOP
  IF (tier->>'min_ea') !~ '^[0-9]+$' OR (tier->>'unit_price_krw') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
   OR NOT (tier ? 'min_ea' AND tier ? 'unit_price_krw') THEN RAISE EXCEPTION 'invalid tier' USING ERRCODE='22023'; END IF;
  n:=(tier->>'min_ea')::integer;
  IF n<1 OR n>1000000 OR n=ANY(seen) OR (tier->>'unit_price_krw')::numeric<=0 THEN RAISE EXCEPTION 'invalid tier' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,n);
 END LOOP;
 UPDATE b2b_price_revisions SET status='approved',approved_by=p_actor,approved_at=now() WHERE id=p_id RETURNING * INTO r;
 INSERT INTO b2b_pricing_audit(actor_id,action,record_id,details) VALUES(p_actor,'price_approved',p_id,jsonb_build_object('base_version_id',base_id,'reason',r.change_reason));
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_add_exchange_rate(p_actor uuid,p_rate numeric,p_source text,p_observed timestamptz,p_until timestamptz,p_reason text)
RETURNS public.b2b_exchange_rates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r b2b_exchange_rates;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_actor AND status='active' AND role='admin')
  THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF p_observed>now() OR p_until<=now() THEN RAISE EXCEPTION 'invalid rate period' USING ERRCODE='22023'; END IF;
 INSERT INTO b2b_exchange_rates(krw_per_usd,source,observed_at,valid_until,reason,created_by)
 VALUES(p_rate,p_source,p_observed,p_until,p_reason,p_actor) RETURNING * INTO r;
 INSERT INTO b2b_pricing_audit(actor_id,action,record_id,details) VALUES(p_actor,'exchange_rate_approved',r.id,jsonb_build_object('reason',p_reason));
 RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.b2b_pricing_immutable() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_save_price_drafts(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_approve_price(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.b2b_add_exchange_rate(uuid,numeric,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_save_price_drafts(uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_approve_price(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_add_exchange_rate(uuid,numeric,text,timestamptz,timestamptz,text) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20260929150000_b2b_pricing') ON CONFLICT DO NOTHING;
COMMIT;
