-- File uploads use the existing public media bucket. Gallery changes remain audited drafts.
BEGIN;
CREATE FUNCTION public.b2b_product_image_url_valid(p_url text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT p_url IS NOT NULL AND length(p_url) BETWEEN 1 AND 2048 AND p_url!~'[[:space:][:cntrl:]]' AND position(chr(92) IN p_url)=0 AND
 ((p_url LIKE '/%' AND p_url NOT LIKE '//%') OR p_url~*'^https://[^/@?#[:space:]]+([/?#]|$)')
$$;
CREATE FUNCTION public.b2b_product_images_valid(p_images jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE item jsonb;seen text[]:='{}';url text;
BEGIN
 IF p_images IS NULL OR p_images='null'::jsonb THEN RETURN true;END IF;
 IF jsonb_typeof(p_images)<>'array' THEN RETURN false;END IF;
 IF jsonb_array_length(p_images)>6 THEN RETURN false;END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_images) LOOP
  IF jsonb_typeof(item)<>'string' THEN RETURN false;END IF;
  url:=normalize(item#>>'{}',NFC);
  IF NOT public.b2b_product_image_url_valid(url) OR url=ANY(seen) THEN RETURN false;END IF;
  seen:=array_append(seen,url);
 END LOOP;RETURN true;
END $$;
ALTER TABLE public.products ADD COLUMN images jsonb;
ALTER TABLE public.products ADD CONSTRAINT products_images_valid CHECK(public.b2b_product_images_valid(images));
-- A new nullable column must not invalidate an existing administrator's open draft.
-- Images become part of concurrency checks as soon as they have an explicit stored value.
CREATE FUNCTION public.b2b_product_fingerprint(p_product jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT encode(sha256(convert_to((CASE WHEN p_product->'images'='null'::jsonb THEN p_product-'images' ELSE p_product END)::text,'UTF8')),'hex')
$$;
CREATE OR REPLACE FUNCTION public.b2b_product_draft_validate(p_data jsonb,p_notes jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE k text;v jsonb;s text;entry jsonb;
BEGIN
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR jsonb_typeof(p_notes) IS DISTINCT FROM 'object' OR octet_length(p_data::text)>65536 OR octet_length(p_notes::text)>24000 THEN RAISE EXCEPTION 'invalid product draft' USING ERRCODE='22023';END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_data) LOOP
  IF NOT k=ANY(ARRAY['name','name_en','sku','collection','category','format','finish','color','look','image_url','description','thickness','origin','brand','manufacturer','country_of_origin','net_weight','package_size','shelf_life','storage','ingredients','allergens','carton_size','hs_code','production_lead_time','export_packaging','loading_port','price','original_price','stock','deal_discount_percent','carton_qty','gross_weight','cbm','moq_cartons','is_featured','is_todays_deal','is_best_seller','certifications','target_markets','images']) THEN RAISE EXCEPTION 'unknown product field' USING ERRCODE='22023';END IF;
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
  ELSIF k='images' THEN
   IF NOT public.b2b_product_images_valid(v) THEN RAISE EXCEPTION 'invalid product images' USING ERRCODE='22023';END IF;
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
CREATE OR REPLACE FUNCTION public.b2b_product_draft_snapshot(p_actor uuid,p_id uuid DEFAULT NULL,p_product_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  RETURN jsonb_build_object('product',p,'base_hash',public.b2b_product_fingerprint(p),'draft',CASE WHEN d.id IS NULL THEN NULL ELSE to_jsonb(d) END);
 END IF;
 RETURN jsonb_build_object('drafts',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.updated_at DESC,t.id),'[]') FROM (SELECT * FROM public.b2b_product_drafts WHERE status='draft' ORDER BY updated_at DESC,id LIMIT 200)t));
END $$;
CREATE OR REPLACE FUNCTION public.b2b_save_product_draft(p_actor uuid,p_id uuid,p_product_id text,p_revision integer,p_base_hash text,p_data jsonb,p_source_notes jsonb,p_reason text,p_rebase boolean DEFAULT false)
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
   hash:=public.b2b_product_fingerprint(p);IF p_base_hash IS DISTINCT FROM hash THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
  ELSIF p_base_hash IS NOT NULL THEN RAISE EXCEPTION 'invalid new base' USING ERRCODE='22023';END IF;
  INSERT INTO public.b2b_product_drafts(id,product_id,data,source_notes,base_product,base_hash,created_by,updated_by)
   VALUES(new_id,p_product_id,p_data,'{"specification":"","label":"","sales_terms":""}'::jsonb||p_source_notes,p,hash,p_actor,p_actor) RETURNING * INTO d;event_name:='create';
 ELSE
  IF old_row.status<>'draft' OR old_row.revision IS DISTINCT FROM p_revision OR old_row.product_id IS DISTINCT FROM p_product_id THEN RAISE EXCEPTION 'stale draft' USING ERRCODE='40001';END IF;
  p:=old_row.base_product;hash:=old_row.base_hash;
  IF p_rebase THEN
   IF p_product_id IS NULL THEN RAISE EXCEPTION 'new draft cannot rebase' USING ERRCODE='22023';END IF;
   SELECT to_jsonb(t) INTO p FROM public.products t WHERE id=p_product_id FOR SHARE;IF p IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
   hash:=public.b2b_product_fingerprint(p);IF p_base_hash IS DISTINCT FROM hash THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
  ELSIF p_base_hash IS DISTINCT FROM old_row.base_hash THEN RAISE EXCEPTION 'base changed without confirmation' USING ERRCODE='40001';END IF;
  PERFORM public.b2b_product_draft_validate(old_row.data||p_data,old_row.source_notes||p_source_notes);
  UPDATE public.b2b_product_drafts SET data=old_row.data||p_data,source_notes=old_row.source_notes||p_source_notes,base_product=p,base_hash=hash,revision=revision+1,updated_by=p_actor,updated_at=now() WHERE id=new_id RETURNING * INTO d;
  event_name:=CASE WHEN p_rebase THEN 'rebase' ELSE 'save' END;
 END IF;
 INSERT INTO public.b2b_product_draft_events(draft_id,actor_id,event,reason,before_state,after_state) VALUES(d.id,p_actor,event_name,trim(p_reason),CASE WHEN old_row.id IS NULL THEN NULL ELSE to_jsonb(old_row) END,to_jsonb(d));
 RETURN d;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_publish_product_draft(p_actor uuid,p_id uuid,p_revision integer,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.b2b_product_drafts;old_row public.b2b_product_drafts;current_product jsonb;candidate jsonb;published jsonb;gallery jsonb;new_id text;k text;taxonomy jsonb:='[{"collection":"K-김치/발효식품","categories":["김치 & 발효식품"]},{"collection":"K-만두/냉동식품","categories":["만두 & 교자"]},{"collection":"K-간편식/HMR","categories":["떡볶이 & 밀키트","국 & 탕류","간편식 & 조리육류"]},{"collection":"K-면류/라면","categories":["라면","생면 & 국수","당면"]},{"collection":"K-소스/장류","categories":["장류","소스 & 양념","분말 조미료"]},{"collection":"K-김/수산가공","categories":["김 가공품","해조류","어묵 & 수산가공","건어물 & 안주류"]},{"collection":"K-스낵/전통과자","categories":["스낵 & 과자","전통과자"]},{"collection":"K-주류/전통주","categories":["증류식 소주","막걸리 & 탁주"]},{"collection":"K-음료/전통차","categories":["전통 음료","전통차"]}]'::jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT public.b2b_ops_eligible_staff(p_actor) OR NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role IN('admin','product_staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO d FROM public.b2b_product_drafts WHERE id=p_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'missing draft' USING ERRCODE='P0002';END IF;
 IF d.status<>'draft' OR d.revision IS DISTINCT FROM p_revision OR d.revision>=2147483647 THEN RAISE EXCEPTION 'stale draft' USING ERRCODE='40001';END IF;
 IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'reason required' USING ERRCODE='22023';END IF;
 IF d.product_id IS NOT NULL THEN
  SELECT to_jsonb(t) INTO current_product FROM public.products t WHERE id=d.product_id FOR UPDATE;IF current_product IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
  IF d.base_hash IS DISTINCT FROM public.b2b_product_fingerprint(current_product) THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
 END IF;
 PERFORM public.b2b_product_draft_validate(d.data,d.source_notes);candidate:=coalesce(current_product,'{}')||d.data;

 -- Synchronize image fields only when explicitly changed. Old untouched records remain intact.
 IF d.data?'images' THEN
  IF jsonb_typeof(candidate->'images')='array' AND jsonb_array_length(candidate->'images')>0 THEN
   candidate:=candidate||jsonb_build_object('image_url',candidate->'images'->0);
  ELSE candidate:=candidate||jsonb_build_object('images','[]'::jsonb,'image_url',NULL);END IF;
 ELSIF d.data?'image_url' THEN
  IF coalesce(candidate->>'image_url','')='' THEN candidate:=candidate||jsonb_build_object('images','[]'::jsonb,'image_url',NULL);
  ELSE
   SELECT coalesce(jsonb_agg(url ORDER BY ord),'[]') INTO gallery FROM (
    SELECT candidate->>'image_url' AS url,0::bigint AS ord UNION ALL
    SELECT value,ordinality FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(current_product->'images')='array' THEN current_product->'images' ELSE '[]'::jsonb END) WITH ORDINALITY WHERE value<>candidate->>'image_url' ORDER BY ord LIMIT 6
   )chosen;
   candidate:=candidate||jsonb_build_object('images',gallery);
  END IF;
 END IF;
 -- Only a supplied Korean or English name is required. Empty optional identity fields
 -- become NULL, without manufacturing a translated name or product classification.
 FOREACH k IN ARRAY ARRAY['name','name_en','sku','collection','category'] LOOP
  IF regexp_replace(replace(replace(coalesce(candidate->>k,''),chr(160),' '),chr(8239),' '),'[[:space:]]+','','g')='' THEN
   candidate:=jsonb_set(candidate,ARRAY[k],'null'::jsonb,true);
  END IF;
 END LOOP;
 IF candidate->>'name' IS NULL AND candidate->>'name_en' IS NULL THEN RAISE EXCEPTION 'Korean or English product name required' USING ERRCODE='22023';END IF;
 -- This UUID-based value is an internal management code, not a supplier SKU claim.
 -- The server generates the UUID; the normalized unique index remains authoritative.
 IF candidate->>'sku' IS NULL THEN candidate:=candidate||jsonb_build_object('sku','AUTO-'||gen_random_uuid()::text);END IF;
 IF candidate->>'collection' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(taxonomy)t WHERE t->>'collection'=candidate->>'collection') THEN RAISE EXCEPTION 'invalid product collection' USING ERRCODE='22023';END IF;
 IF candidate->>'category' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(taxonomy)t CROSS JOIN LATERAL jsonb_array_elements_text(t->'categories')c WHERE c=candidate->>'category') THEN RAISE EXCEPTION 'invalid product category' USING ERRCODE='22023';END IF;
 IF candidate->>'collection' IS NOT NULL AND candidate->>'category' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(taxonomy)t WHERE t->>'collection'=candidate->>'collection' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(t->'categories')c WHERE c=candidate->>'category')) THEN RAISE EXCEPTION 'invalid product taxonomy pair' USING ERRCODE='22023';END IF;
 new_id:=coalesce(d.product_id,'prod-'||gen_random_uuid()::text);
 candidate:=candidate||jsonb_build_object('id',new_id,'created_at',coalesce(current_product->'created_at',to_jsonb(now())),'updated_at',now());
 IF d.product_id IS NULL THEN
  INSERT INTO public.products SELECT r.* FROM jsonb_populate_record(NULL::public.products,candidate)r RETURNING to_jsonb(products) INTO published;
 ELSE
  UPDATE public.products SET (name,name_en,sku,collection,category,format,finish,color,look,image_url,images,description,thickness,origin,brand,manufacturer,country_of_origin,net_weight,package_size,shelf_life,storage,ingredients,allergens,carton_size,hs_code,production_lead_time,export_packaging,loading_port,price,original_price,stock,deal_discount_percent,carton_qty,gross_weight,cbm,moq_cartons,is_featured,is_todays_deal,is_best_seller,certifications,target_markets,updated_at)=(SELECT r.name,r.name_en,r.sku,r.collection,r.category,r.format,r.finish,r.color,r.look,r.image_url,r.images,r.description,r.thickness,r.origin,r.brand,r.manufacturer,r.country_of_origin,r.net_weight,r.package_size,r.shelf_life,r.storage,r.ingredients,r.allergens,r.carton_size,r.hs_code,r.production_lead_time,r.export_packaging,r.loading_port,r.price,r.original_price,r.stock,r.deal_discount_percent,r.carton_qty,r.gross_weight,r.cbm,r.moq_cartons,r.is_featured,r.is_todays_deal,r.is_best_seller,r.certifications,r.target_markets,now() FROM jsonb_populate_record(NULL::public.products,candidate)r) WHERE id=new_id RETURNING to_jsonb(products) INTO published;
 END IF;
 old_row:=d;
 UPDATE public.b2b_product_drafts SET product_id=new_id,status='published',revision=revision+1,updated_by=p_actor,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 INSERT INTO public.b2b_product_draft_events(draft_id,actor_id,event,reason,before_state,after_state) VALUES(d.id,p_actor,'publish',trim(p_reason),to_jsonb(old_row),jsonb_build_object('draft',to_jsonb(d),'product_before',current_product,'product_after',published));
 RETURN jsonb_build_object('draft',to_jsonb(d),'product',published);
END $$;

-- Preserve existing launch-review fingerprints when the new gallery is still unknown.
CREATE OR REPLACE FUNCTION public.b2b_release_facts(p_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb;prices jsonb;issues text[]:='{}';export_issues text[]:='{}';k text;domestic_ready boolean;export_ready boolean;snapshot jsonb;
BEGIN
 SELECT to_jsonb(t)-ARRAY['price','price_krw','wholesale_price_krw','box_price','carton_price','original_price','stock','updated_at','created_at','rating','reviews_count'] INTO p FROM public.products t WHERE id=p_id;
 IF p->'images'='null'::jsonb THEN p:=p-'images';END IF;
 IF p IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
 FOREACH k IN ARRAY ARRAY['name','sku','country_of_origin','storage','shelf_life','ingredients','allergens','net_weight'] LOOP
 IF coalesce(length(trim(p->>k)),0)=0 THEN issues:=array_append(issues,k||' 미입력');END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.price_list_id),'[]'::jsonb) INTO prices FROM (
 SELECT DISTINCT ON (r.price_list_id) r.*,l.scope FROM public.b2b_price_revisions r JOIN public.b2b_price_lists l ON l.id=r.price_list_id
 WHERE r.product_id=p_id AND l.active AND r.status='approved' AND r.valid_from<=now() ORDER BY r.price_list_id,r.version DESC)r;
 domestic_ready:=EXISTS(SELECT 1 FROM jsonb_array_elements(prices) r WHERE r->>'scope' IN('common','personal') AND (r->>'valid_until')::timestamptz>now());
 export_ready:=EXISTS(SELECT 1 FROM jsonb_array_elements(prices) r WHERE r->>'scope' IN('common','business','company') AND (r->>'valid_until')::timestamptz>now()
 AND r->>'fob_status'='included' AND (r->>'export_moq_ctn')::integer>0 AND coalesce((r->>'ea_per_carton')::integer,(r->>'ea_per_box')::integer*(r->>'boxes_per_carton')::integer)>0);
 IF NOT domestic_ready THEN issues:=array_append(issues,'유효한 공통·개인 승인 가격 없음');END IF;
 export_issues:=ARRAY[]::text[];
 FOREACH k IN ARRAY ARRAY['name','name_en','sku','country_of_origin','storage','shelf_life','ingredients','allergens','net_weight'] LOOP
 IF coalesce(length(trim(p->>k)),0)=0 THEN export_issues:=array_append(export_issues,k||' 미입력');END IF;
 END LOOP;
 IF NOT export_ready THEN export_issues:=array_append(export_issues,'유효한 FOB 포함 가격·카톤 환산·수출 MOQ 없음');END IF;
 snapshot:=jsonb_build_object('product',p,'prices',prices);
 RETURN jsonb_build_object('product_id',p_id,'name',p->>'name','sku',p->>'sku',
 'fingerprint',encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),'domestic_issues',issues,'export_issues',export_issues);
END $$;
-- The server uses service_role after staff/origin validation; browsers cannot write or list objects.
UPDATE storage.buckets SET file_size_limit=52428800,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'] WHERE id='media';
CREATE POLICY b2b_media_server_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING(bucket_id<>'media') WITH CHECK(bucket_id<>'media');
REVOKE ALL ON public.media_library FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.media_library TO service_role;
CREATE POLICY b2b_media_library_server_only ON public.media_library AS RESTRICTIVE FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
REVOKE ALL ON FUNCTION public.b2b_product_draft_validate(jsonb,jsonb),public.b2b_product_draft_snapshot(uuid,uuid,text),public.b2b_save_product_draft(uuid,uuid,text,integer,text,jsonb,jsonb,text,boolean),public.b2b_publish_product_draft(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_product_draft_validate(jsonb,jsonb),public.b2b_product_draft_snapshot(uuid,uuid,text),public.b2b_save_product_draft(uuid,uuid,text,integer,text,jsonb,jsonb,text,boolean),public.b2b_publish_product_draft(uuid,uuid,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.b2b_product_image_url_valid(text),public.b2b_product_images_valid(jsonb),public.b2b_product_fingerprint(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_product_image_url_valid(text),public.b2b_product_images_valid(jsonb),public.b2b_product_fingerprint(jsonb) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261015140000_b2b_product_images');
COMMIT;
