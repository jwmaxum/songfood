-- Private incomplete drafts; explicit publication never approves prices or trade release.
BEGIN;
DO $$ DECLARE k text;BEGIN
 FOREACH k IN ARRAY ARRAY['name_en','description','price','original_price','stock','rating','reviews_count','format','finish','color','look','image_url','thickness','origin','is_featured','is_todays_deal','is_best_seller','deal_discount_percent','brand','manufacturer','country_of_origin','net_weight','package_size','shelf_life','storage','ingredients','allergens','certifications','carton_qty','wholesale_discount_rate','wholesale_price_krw','export_price_usd','carton_size','gross_weight','cbm','moq_cartons','hs_code','production_lead_time','export_packaging','loading_port','target_markets'] LOOP
  EXECUTE format('ALTER TABLE public.products ALTER COLUMN %I DROP NOT NULL, ALTER COLUMN %I DROP DEFAULT',k,k);
 END LOOP;
END $$;
CREATE FUNCTION public.b2b_product_sku_key(p_sku text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT lower(regexp_replace(replace(replace(normalize(coalesce(p_sku,''),NFC),chr(160),' '),chr(8239),' '),'[[:space:]]+','','g'))
$$;
-- Verify normalized duplicates before applying. Existing product values are untouched.
CREATE UNIQUE INDEX products_sku_normalized_unique ON public.products(public.b2b_product_sku_key(sku)) WHERE public.b2b_product_sku_key(sku)<>'';
CREATE TABLE public.b2b_product_drafts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id text REFERENCES public.products(id),revision integer NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 2147483647),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published')),data jsonb NOT NULL DEFAULT '{}',source_notes jsonb NOT NULL DEFAULT '{"specification":"","label":"","sales_terms":""}',
 base_hash text,base_product jsonb,created_by uuid NOT NULL REFERENCES auth.users(id),updated_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(jsonb_typeof(data)='object' AND jsonb_typeof(source_notes)='object')
);
CREATE UNIQUE INDEX b2b_product_one_pending_draft ON public.b2b_product_drafts(product_id) WHERE status='draft' AND product_id IS NOT NULL;
CREATE TABLE public.b2b_product_draft_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),draft_id uuid NOT NULL REFERENCES public.b2b_product_drafts(id),actor_id uuid NOT NULL REFERENCES auth.users(id),
 event text NOT NULL CHECK(event IN('create','save','rebase','publish')),reason text NOT NULL,before_state jsonb,after_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER b2b_product_draft_events_immutable BEFORE UPDATE OR DELETE ON public.b2b_product_draft_events FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_product_drafts','b2b_product_draft_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE FUNCTION public.b2b_product_draft_validate(p_data jsonb,p_notes jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE k text;v jsonb;s text;entry jsonb;
BEGIN
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR jsonb_typeof(p_notes) IS DISTINCT FROM 'object' OR octet_length(p_data::text)>65536 OR octet_length(p_notes::text)>24000 THEN RAISE EXCEPTION 'invalid product draft' USING ERRCODE='22023';END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_data) LOOP
  IF NOT k=ANY(ARRAY['name','name_en','sku','collection','category','format','finish','color','look','image_url','description','thickness','origin','brand','manufacturer','country_of_origin','net_weight','package_size','shelf_life','storage','ingredients','allergens','carton_size','hs_code','production_lead_time','export_packaging','loading_port','price','original_price','stock','deal_discount_percent','carton_qty','gross_weight','cbm','moq_cartons','is_featured','is_todays_deal','is_best_seller','certifications','target_markets']) THEN RAISE EXCEPTION 'unknown product field' USING ERRCODE='22023';END IF;
  IF v='null'::jsonb THEN CONTINUE;END IF;
  IF k=ANY(ARRAY['name','name_en','sku','collection','category','format','finish','color','look','image_url','description','thickness','origin','brand','manufacturer','country_of_origin','net_weight','package_size','shelf_life','storage','ingredients','allergens','carton_size','hs_code','production_lead_time','export_packaging','loading_port']) THEN
   IF jsonb_typeof(v)<>'string' OR length(v#>>'{}')>(CASE WHEN k IN('description','ingredients','allergens') THEN 10000 ELSE 2048 END) THEN RAISE EXCEPTION 'invalid product text' USING ERRCODE='22023';END IF;
   s:=v#>>'{}';
   IF regexp_replace(s,E'[\n\r\t]','','g')~'[[:cntrl:]]' THEN RAISE EXCEPTION 'invalid control character' USING ERRCODE='22023';END IF;
   IF k='image_url' AND s<>'' AND NOT((s LIKE '/%' AND s NOT LIKE '//%' AND position(chr(92) IN s)=0 AND s!~'[[:cntrl:]]') OR s~*'^https://[^/@[:space:]]+([/?#]|$)') THEN RAISE EXCEPTION 'invalid image URL' USING ERRCODE='22023';END IF;
  ELSIF k=ANY(ARRAY['price','original_price','stock','deal_discount_percent','carton_qty','gross_weight','cbm','moq_cartons']) THEN
   IF jsonb_typeof(v)<>'number' OR (v#>>'{}')::numeric<0 OR (v#>>'{}')::numeric>9999999999.99 OR (k IN('stock','carton_qty','moq_cartons','deal_discount_percent') AND trunc((v#>>'{}')::numeric)<>(v#>>'{}')::numeric) OR (k='deal_discount_percent' AND (v#>>'{}')::numeric>100) THEN RAISE EXCEPTION 'invalid product number' USING ERRCODE='22023';END IF;
  ELSIF k=ANY(ARRAY['is_featured','is_todays_deal','is_best_seller']) THEN
   IF jsonb_typeof(v)<>'boolean' THEN RAISE EXCEPTION 'invalid product flag' USING ERRCODE='22023';END IF;
  ELSIF k=ANY(ARRAY['certifications','target_markets']) THEN
   IF jsonb_typeof(v)<>'array' OR jsonb_array_length(v)>30 THEN RAISE EXCEPTION 'invalid product list' USING ERRCODE='22023';END IF;
   FOR entry IN SELECT value FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(entry)<>'string' OR length(entry#>>'{}')>250 OR regexp_replace(entry#>>'{}',E'[\n\r\t]','','g')~'[[:cntrl:]]' THEN RAISE EXCEPTION 'invalid product list entry' USING ERRCODE='22023';END IF;
   END LOOP;
  END IF;
 END LOOP;
 FOR k,v IN SELECT * FROM jsonb_each(p_notes) LOOP
  IF NOT k=ANY(ARRAY['specification','label','sales_terms']) OR jsonb_typeof(v)<>'string' OR length(v#>>'{}')>6000 OR regexp_replace(v#>>'{}',E'[\n\r\t]','','g')~'[[:cntrl:]]' THEN RAISE EXCEPTION 'invalid private source note' USING ERRCODE='22023';END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.b2b_product_draft_snapshot(p_actor uuid,p_id uuid DEFAULT NULL,p_product_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.b2b_product_drafts;p jsonb;
BEGIN
 IF NOT public.b2b_ops_eligible_staff(p_actor) OR NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role IN('admin','product_staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_id IS NOT NULL AND p_product_id IS NOT NULL THEN RAISE EXCEPTION 'invalid query' USING ERRCODE='22023';END IF;
 IF p_id IS NOT NULL THEN
  SELECT * INTO d FROM public.b2b_product_drafts WHERE id=p_id;IF NOT FOUND THEN RAISE EXCEPTION 'missing draft' USING ERRCODE='P0002';END IF;
  RETURN jsonb_build_object('draft',to_jsonb(d));
 ELSIF p_product_id IS NOT NULL THEN
  SELECT to_jsonb(t) INTO p FROM public.products t WHERE id=p_product_id;IF p IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
  SELECT * INTO d FROM public.b2b_product_drafts WHERE product_id=p_product_id AND status='draft';
  RETURN jsonb_build_object('product',p,'base_hash',encode(sha256(convert_to(p::text,'UTF8')),'hex'),'draft',CASE WHEN d.id IS NULL THEN NULL ELSE to_jsonb(d) END);
 END IF;
 RETURN jsonb_build_object('drafts',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.updated_at DESC,t.id),'[]') FROM (SELECT * FROM public.b2b_product_drafts WHERE status='draft' ORDER BY updated_at DESC,id LIMIT 200)t));
END $$;
CREATE FUNCTION public.b2b_save_product_draft(p_actor uuid,p_id uuid,p_product_id text,p_revision integer,p_base_hash text,p_data jsonb,p_source_notes jsonb,p_reason text,p_rebase boolean DEFAULT false)
RETURNS public.b2b_product_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.b2b_product_drafts;old_row public.b2b_product_drafts;p jsonb;hash text;event_name text;new_id uuid:=coalesce(p_id,gen_random_uuid());
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT public.b2b_ops_eligible_staff(p_actor) OR NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role IN('admin','product_staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 PERFORM public.b2b_product_draft_validate(p_data,p_source_notes);
 IF p_revision IS NULL OR p_revision NOT BETWEEN 0 AND 2147483646 OR p_rebase IS NULL OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'invalid save metadata' USING ERRCODE='22023';END IF;
 SELECT * INTO old_row FROM public.b2b_product_drafts WHERE id=new_id FOR UPDATE;
 IF old_row.id IS NULL THEN
  IF p_revision<>0 OR p_rebase THEN RAISE EXCEPTION 'stale new draft' USING ERRCODE='40001';END IF;
  IF p_product_id IS NOT NULL THEN
   SELECT to_jsonb(t) INTO p FROM public.products t WHERE id=p_product_id FOR SHARE;IF p IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
   hash:=encode(sha256(convert_to(p::text,'UTF8')),'hex');IF p_base_hash IS DISTINCT FROM hash THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
  ELSIF p_base_hash IS NOT NULL THEN RAISE EXCEPTION 'invalid new base' USING ERRCODE='22023';END IF;
  INSERT INTO public.b2b_product_drafts(id,product_id,data,source_notes,base_product,base_hash,created_by,updated_by)
   VALUES(new_id,p_product_id,p_data,'{"specification":"","label":"","sales_terms":""}'::jsonb||p_source_notes,p,hash,p_actor,p_actor) RETURNING * INTO d;event_name:='create';
 ELSE
  IF old_row.status<>'draft' OR old_row.revision IS DISTINCT FROM p_revision OR old_row.product_id IS DISTINCT FROM p_product_id THEN RAISE EXCEPTION 'stale draft' USING ERRCODE='40001';END IF;
  p:=old_row.base_product;hash:=old_row.base_hash;
  IF p_rebase THEN
   IF p_product_id IS NULL THEN RAISE EXCEPTION 'new draft cannot rebase' USING ERRCODE='22023';END IF;
   SELECT to_jsonb(t) INTO p FROM public.products t WHERE id=p_product_id FOR SHARE;IF p IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
   hash:=encode(sha256(convert_to(p::text,'UTF8')),'hex');IF p_base_hash IS DISTINCT FROM hash THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
  ELSIF p_base_hash IS DISTINCT FROM old_row.base_hash THEN RAISE EXCEPTION 'base changed without confirmation' USING ERRCODE='40001';END IF;
  PERFORM public.b2b_product_draft_validate(old_row.data||p_data,old_row.source_notes||p_source_notes);
  UPDATE public.b2b_product_drafts SET data=old_row.data||p_data,source_notes=old_row.source_notes||p_source_notes,base_product=p,base_hash=hash,revision=revision+1,updated_by=p_actor,updated_at=now() WHERE id=new_id RETURNING * INTO d;
  event_name:=CASE WHEN p_rebase THEN 'rebase' ELSE 'save' END;
 END IF;
 INSERT INTO public.b2b_product_draft_events(draft_id,actor_id,event,reason,before_state,after_state) VALUES(d.id,p_actor,event_name,trim(p_reason),CASE WHEN old_row.id IS NULL THEN NULL ELSE to_jsonb(old_row) END,to_jsonb(d));
 RETURN d;
END $$;
CREATE FUNCTION public.b2b_publish_product_draft(p_actor uuid,p_id uuid,p_revision integer,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.b2b_product_drafts;old_row public.b2b_product_drafts;current_product jsonb;candidate jsonb;published jsonb;new_id text;k text;taxonomy jsonb:='[{"collection":"K-김치/발효식품","categories":["김치 & 발효식품"]},{"collection":"K-만두/냉동식품","categories":["만두 & 교자"]},{"collection":"K-간편식/HMR","categories":["떡볶이 & 밀키트","국 & 탕류","간편식 & 조리육류"]},{"collection":"K-면류/라면","categories":["라면","생면 & 국수","당면"]},{"collection":"K-소스/장류","categories":["장류","소스 & 양념","분말 조미료"]},{"collection":"K-김/수산가공","categories":["김 가공품","해조류","어묵 & 수산가공","건어물 & 안주류"]},{"collection":"K-스낵/전통과자","categories":["스낵 & 과자","전통과자"]},{"collection":"K-주류/전통주","categories":["증류식 소주","막걸리 & 탁주"]},{"collection":"K-음료/전통차","categories":["전통 음료","전통차"]}]'::jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT public.b2b_ops_eligible_staff(p_actor) OR NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role IN('admin','product_staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO d FROM public.b2b_product_drafts WHERE id=p_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'missing draft' USING ERRCODE='P0002';END IF;
 IF d.status<>'draft' OR d.revision IS DISTINCT FROM p_revision OR d.revision>=2147483647 THEN RAISE EXCEPTION 'stale draft' USING ERRCODE='40001';END IF;
 IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'reason required' USING ERRCODE='22023';END IF;
 IF d.product_id IS NOT NULL THEN
  SELECT to_jsonb(t) INTO current_product FROM public.products t WHERE id=d.product_id FOR UPDATE;IF current_product IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
  IF d.base_hash IS DISTINCT FROM encode(sha256(convert_to(current_product::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
 END IF;
 PERFORM public.b2b_product_draft_validate(d.data,d.source_notes);candidate:=coalesce(current_product,'{}')||d.data;
 FOREACH k IN ARRAY ARRAY['name','sku','collection','category'] LOOP
  IF jsonb_typeof(candidate->k) IS DISTINCT FROM 'string' OR coalesce(length(trim(candidate->>k)),0)=0 THEN RAISE EXCEPTION 'catalogue identity required' USING ERRCODE='22023';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(taxonomy)t WHERE t->>'collection'=candidate->>'collection' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(t->'categories')c WHERE c=candidate->>'category')) THEN RAISE EXCEPTION 'invalid product taxonomy' USING ERRCODE='22023';END IF;
 new_id:=coalesce(d.product_id,'prod-'||gen_random_uuid()::text);
 candidate:=candidate||jsonb_build_object('id',new_id,'created_at',coalesce(current_product->'created_at',to_jsonb(now())),'updated_at',now());
 IF d.product_id IS NULL THEN
  INSERT INTO public.products SELECT r.* FROM jsonb_populate_record(NULL::public.products,candidate)r RETURNING to_jsonb(products) INTO published;
 ELSE
  UPDATE public.products SET (name,name_en,sku,collection,category,format,finish,color,look,image_url,description,thickness,origin,brand,manufacturer,country_of_origin,net_weight,package_size,shelf_life,storage,ingredients,allergens,carton_size,hs_code,production_lead_time,export_packaging,loading_port,price,original_price,stock,deal_discount_percent,carton_qty,gross_weight,cbm,moq_cartons,is_featured,is_todays_deal,is_best_seller,certifications,target_markets,updated_at)=(SELECT r.name,r.name_en,r.sku,r.collection,r.category,r.format,r.finish,r.color,r.look,r.image_url,r.description,r.thickness,r.origin,r.brand,r.manufacturer,r.country_of_origin,r.net_weight,r.package_size,r.shelf_life,r.storage,r.ingredients,r.allergens,r.carton_size,r.hs_code,r.production_lead_time,r.export_packaging,r.loading_port,r.price,r.original_price,r.stock,r.deal_discount_percent,r.carton_qty,r.gross_weight,r.cbm,r.moq_cartons,r.is_featured,r.is_todays_deal,r.is_best_seller,r.certifications,r.target_markets,now() FROM jsonb_populate_record(NULL::public.products,candidate)r) WHERE id=new_id RETURNING to_jsonb(products) INTO published;
 END IF;
 old_row:=d;
 UPDATE public.b2b_product_drafts SET product_id=new_id,status='published',revision=revision+1,updated_by=p_actor,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 INSERT INTO public.b2b_product_draft_events(draft_id,actor_id,event,reason,before_state,after_state) VALUES(d.id,p_actor,'publish',trim(p_reason),to_jsonb(old_row),jsonb_build_object('draft',to_jsonb(d),'product_before',current_product,'product_after',published));
 RETURN jsonb_build_object('draft',to_jsonb(d),'product',published);
END $$;
REVOKE ALL ON FUNCTION public.b2b_product_sku_key(text),public.b2b_product_draft_validate(jsonb,jsonb),public.b2b_product_draft_snapshot(uuid,uuid,text),public.b2b_save_product_draft(uuid,uuid,text,integer,text,jsonb,jsonb,text,boolean),public.b2b_publish_product_draft(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_product_sku_key(text),public.b2b_product_draft_validate(jsonb,jsonb),public.b2b_product_draft_snapshot(uuid,uuid,text),public.b2b_save_product_draft(uuid,uuid,text,integer,text,jsonb,jsonb,text,boolean),public.b2b_publish_product_draft(uuid,uuid,integer,text) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261015120000_b2b_product_drafts');
COMMIT;
