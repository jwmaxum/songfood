-- Caller must wrap in BEGIN/ROLLBACK. All catalogue examples below are QA fixtures.
DO $$
DECLARE actor uuid:=gen_random_uuid();bad uuid:=gen_random_uuid();d public.b2b_product_drafts;edit public.b2b_product_drafts;r jsonb;s jsonb;ko_product jsonb;en_product jsonb;classified jsonb;manual_sku text:='QA-PARTIAL-'||gen_random_uuid()::text;before_products integer;before_prices integer;before_releases integer;payload jsonb;
BEGIN
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT id,id||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[actor,bad])id;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(actor,actor||'@example.invalid','QA partial product editor','product_staff','active'),(bad,bad||'@example.invalid','QA unauthorized editor','inquiry_staff','active');
 SELECT count(*) INTO before_products FROM public.products;SELECT count(*) INTO before_prices FROM public.b2b_price_revisions;SELECT count(*) INTO before_releases FROM public.b2b_product_releases;
 d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,'{}','{}','QA nameless private draft');
 BEGIN PERFORM public.b2b_publish_product_draft(actor,d.id,d.revision,'QA no names rejected');RAISE EXCEPTION 'nameless catalogue published';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 d:=public.b2b_save_product_draft(actor,d.id,NULL,d.revision,NULL,jsonb_build_object('name',E' \t\n','name_en',chr(160)||chr(8239)),'{}','QA whitespace name check');
 BEGIN PERFORM public.b2b_publish_product_draft(actor,d.id,d.revision,'QA blank names rejected');RAISE EXCEPTION 'whitespace catalogue published';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 IF (SELECT count(*) FROM public.products)<>before_products THEN RAISE EXCEPTION 'rejected name modified catalogue';END IF;
 d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,'{"name":"QA 한국어 이름만"}','{"specification":"QA private supplier source"}','QA Korean name only');
 BEGIN PERFORM public.b2b_publish_product_draft(bad,d.id,d.revision,'QA unqualified publication');RAISE EXCEPTION 'inquiry staff published';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA Korean partial publication');ko_product:=r->'product';
 IF ko_product->>'name'<>'QA 한국어 이름만' OR ko_product->'name_en' IS DISTINCT FROM 'null'::jsonb OR coalesce(ko_product->>'sku','')!~'^AUTO-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Korean name publication or management code incorrect';END IF;
 IF ko_product->'collection' IS DISTINCT FROM 'null'::jsonb OR ko_product->'category' IS DISTINCT FROM 'null'::jsonb OR ko_product->'price' IS DISTINCT FROM 'null'::jsonb OR ko_product->'stock' IS DISTINCT FROM 'null'::jsonb OR ko_product->'image_url' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'unknown facts fabricated';END IF;
 IF ko_product?'source_notes' OR ko_product?'base_product' THEN RAISE EXCEPTION 'private sources leaked';END IF;
 BEGIN PERFORM public.b2b_publish_product_draft(actor,d.id,d.revision,'QA replay rejected');RAISE EXCEPTION 'published draft replayed';EXCEPTION WHEN serialization_failure THEN NULL;END;
 d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,'{"name":null,"name_en":"QA English name only","sku":"  ","collection":"","category":null}','{}','QA English name only');
 r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA English partial publication');en_product:=r->'product';
 IF en_product->'name' IS DISTINCT FROM 'null'::jsonb OR en_product->>'name_en'<>'QA English name only' OR coalesce(en_product->>'sku','')!~'^AUTO-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR en_product->>'sku'=ko_product->>'sku' OR en_product->>'sku'='AUTO-'||d.id::text THEN RAISE EXCEPTION 'English name was copied or code not unique';END IF;
 IF en_product->'collection' IS DISTINCT FROM 'null'::jsonb OR en_product->'category' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'blank taxonomy not NULL';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,en_product->>'id');
 edit:=public.b2b_save_product_draft(actor,NULL,en_product->>'id',0,s->>'base_hash','{"storage":""}','{}','QA sparse English-only edit');
 UPDATE public.products SET brand='QA concurrent unchanged fact' WHERE id=en_product->>'id';
 BEGIN PERFORM public.b2b_publish_product_draft(actor,edit.id,edit.revision,'QA stale partial update');RAISE EXCEPTION 'partial publication bypassed base hash';EXCEPTION WHEN serialization_failure THEN NULL;END;
 s:=public.b2b_product_draft_snapshot(actor,NULL,en_product->>'id');
 edit:=public.b2b_save_product_draft(actor,edit.id,en_product->>'id',edit.revision,s->>'base_hash','{}','{}','QA explicit current rebase',true);
 r:=public.b2b_publish_product_draft(actor,edit.id,edit.revision,'QA sparse English update publish');
 IF r->'product'->'name' IS DISTINCT FROM 'null'::jsonb OR r->'product'->>'name_en'<>en_product->>'name_en' OR r->'product'->>'sku'<>en_product->>'sku' OR r->'product'->>'brand'<>'QA concurrent unchanged fact' OR r->'product'->>'storage'<>'' THEN RAISE EXCEPTION 'sparse edit changed untouched identity or facts';END IF;
 d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,jsonb_build_object('name','QA classified','sku',manual_sku,'collection','K-만두/냉동식품','category','만두 & 교자'),'{}','QA complete valid classification');
 r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA preserve manual SKU');classified:=r->'product';
 IF classified->>'sku'<>manual_sku THEN RAISE EXCEPTION 'manual SKU replaced';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,classified->>'id');
 edit:=public.b2b_save_product_draft(actor,NULL,classified->>'id',0,s->>'base_hash','{"description":"QA sparse text"}','{}','QA existing classification preserve');
 r:=public.b2b_publish_product_draft(actor,edit.id,edit.revision,'QA sparse classified update');
 IF r->'product'->>'collection'<>classified->>'collection' OR r->'product'->>'category'<>classified->>'category' OR r->'product'->>'sku'<>manual_sku OR r->'product'->>'name'<>classified->>'name' THEN RAISE EXCEPTION 'omitted identity fields lost';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,classified->>'id');
 edit:=public.b2b_save_product_draft(actor,NULL,classified->>'id',0,s->>'base_hash','{"collection":null,"category":""}','{}','QA clear classification explicitly');
 r:=public.b2b_publish_product_draft(actor,edit.id,edit.revision,'QA unclassified existing publication');
 IF r->'product'->'collection' IS DISTINCT FROM 'null'::jsonb OR r->'product'->'category' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'explicit classification clear ignored';END IF;
 FOR payload IN SELECT * FROM (VALUES ('{"collection":"K-소스/장류"}'::jsonb),('{"category":"장류"}'::jsonb))v(data) LOOP
  d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,'{"name":"QA one-level classification"}'::jsonb||payload,'{}','QA optional classification');
  r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA one-level catalogue publication');
  IF (payload?'collection' AND r->'product'->'category' IS DISTINCT FROM 'null'::jsonb) OR (payload?'category' AND r->'product'->'collection' IS DISTINCT FROM 'null'::jsonb) THEN RAISE EXCEPTION 'missing classification inferred';END IF;
 END LOOP;
 FOR payload IN SELECT * FROM (VALUES ('{"collection":"unknown"}'::jsonb),('{"category":"unknown"}'::jsonb),('{"collection":"K-소스/장류","category":"만두 & 교자"}'::jsonb))v(data) LOOP
  d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,'{"name":"QA invalid taxonomy"}'::jsonb||payload,'{}','QA invalid supplied classification');
  BEGIN PERFORM public.b2b_publish_product_draft(actor,d.id,d.revision,'QA invalid taxonomy rejected');RAISE EXCEPTION 'invalid supplied taxonomy published';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 END LOOP;
 d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,jsonb_build_object('name','QA normalized duplicate','sku','  '||lower(manual_sku)||'  '),'{}','QA duplicate SKU draft');
 BEGIN PERFORM public.b2b_publish_product_draft(actor,d.id,d.revision,'QA duplicate SKU rejected');RAISE EXCEPTION 'normalized duplicate SKU published';EXCEPTION WHEN unique_violation THEN NULL;END;
 IF (SELECT count(*) FROM public.b2b_price_revisions)<>before_prices OR (SELECT count(*) FROM public.b2b_product_releases)<>before_releases THEN RAISE EXCEPTION 'partial catalogue publication approved commerce';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.b2b_product_draft_events WHERE draft_id=edit.id AND actor_id=actor AND event='publish') THEN RAISE EXCEPTION 'partial publication audit missing';END IF;
 IF has_function_privilege('anon','public.b2b_publish_product_draft(uuid,uuid,integer,text)','EXECUTE') OR has_function_privilege('authenticated','public.b2b_publish_product_draft(uuid,uuid,integer,text)','EXECUTE') THEN RAISE EXCEPTION 'public publication permission leaked';END IF;
END $$;
