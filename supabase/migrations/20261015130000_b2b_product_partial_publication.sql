-- Publish incomplete catalogue records with one real name. This migration changes
-- constraints/functions only: existing public product rows and trade approvals are untouched.
BEGIN;
ALTER TABLE public.products ALTER COLUMN name DROP NOT NULL, ALTER COLUMN collection DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.b2b_publish_product_draft(p_actor uuid,p_id uuid,p_revision integer,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  UPDATE public.products SET (name,name_en,sku,collection,category,format,finish,color,look,image_url,description,thickness,origin,brand,manufacturer,country_of_origin,net_weight,package_size,shelf_life,storage,ingredients,allergens,carton_size,hs_code,production_lead_time,export_packaging,loading_port,price,original_price,stock,deal_discount_percent,carton_qty,gross_weight,cbm,moq_cartons,is_featured,is_todays_deal,is_best_seller,certifications,target_markets,updated_at)=(SELECT r.name,r.name_en,r.sku,r.collection,r.category,r.format,r.finish,r.color,r.look,r.image_url,r.description,r.thickness,r.origin,r.brand,r.manufacturer,r.country_of_origin,r.net_weight,r.package_size,r.shelf_life,r.storage,r.ingredients,r.allergens,r.carton_size,r.hs_code,r.production_lead_time,r.export_packaging,r.loading_port,r.price,r.original_price,r.stock,r.deal_discount_percent,r.carton_qty,r.gross_weight,r.cbm,r.moq_cartons,r.is_featured,r.is_todays_deal,r.is_best_seller,r.certifications,r.target_markets,now() FROM jsonb_populate_record(NULL::public.products,candidate)r) WHERE id=new_id RETURNING to_jsonb(products) INTO published;
 END IF;
 old_row:=d;
 UPDATE public.b2b_product_drafts SET product_id=new_id,status='published',revision=revision+1,updated_by=p_actor,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 INSERT INTO public.b2b_product_draft_events(draft_id,actor_id,event,reason,before_state,after_state) VALUES(d.id,p_actor,'publish',trim(p_reason),to_jsonb(old_row),jsonb_build_object('draft',to_jsonb(d),'product_before',current_product,'product_after',published));
 RETURN jsonb_build_object('draft',to_jsonb(d),'product',published);
END $$;
REVOKE ALL ON FUNCTION public.b2b_publish_product_draft(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_publish_product_draft(uuid,uuid,integer,text) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261015130000_b2b_product_partial_publication');
COMMIT;
