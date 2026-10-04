-- Run inside caller BEGIN/ROLLBACK. Real product changes and prices never persist.
DO $$
DECLARE a uuid:=gen_random_uuid();s uuid:=gen_random_uuid();buyer uuid:=gen_random_uuid();product text;price uuid;facts jsonb;r public.b2b_product_releases;policy public.b2b_release_policy;lines jsonb;delivery jsonb;id1 uuid;k uuid:=gen_random_uuid();before_count integer;
BEGIN
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT u,u||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[a,s,buyer])u;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(a,a||'@example.invalid','QA release admin','admin','active'),(s,s||'@example.invalid','QA product staff','product_staff','active');
 INSERT INTO public.customer_accounts(id,email,name) VALUES(buyer,buyer||'@example.invalid','QA release buyer');
 SELECT id INTO product FROM public.products ORDER BY id LIMIT 1;
 SELECT revision INTO before_count FROM public.b2b_release_policy WHERE id=true;
 BEGIN PERFORM public.b2b_set_release_policy(a,before_count,true,'QA no reviewed products');RAISE EXCEPTION 'empty launch allowed';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 facts:=public.b2b_release_facts(product);
 BEGIN PERFORM public.b2b_save_release(s,product,0,facts->>'fingerprint',false,false,'QA staff review denied');RAISE EXCEPTION 'staff release bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 UPDATE public.products SET name='QA label only',name_en='QA only',sku='QA-RELEASE',country_of_origin='KR',storage='ambient',shelf_life='QA 12 months',ingredients='QA only',allergens='QA none',net_weight='1kg' WHERE id=product;
 INSERT INTO public.b2b_price_revisions(product_id,price_list_id,version,status,price_unit,unit_price_krw,tax_code,vat_included,minimum_order_unit,minimum_order_quantity,valid_from,valid_until,review_source,change_reason,created_by,approved_by,approved_at)
 VALUES(product,'00000000-0000-4000-8000-000000000201',999997,'approved','EA',1100,'vat10',true,'EA',1,now()-interval '1 day',now()+interval '1 day','rollback only','rollback only',a,a,now()) RETURNING id INTO price;
 facts:=public.b2b_release_facts(product);
 IF jsonb_array_length(facts->'domestic_issues')<>0 THEN RAISE EXCEPTION 'valid domestic review blocked: %',facts;END IF;
 BEGIN PERFORM public.b2b_save_release(a,product,0,facts->>'fingerprint',false,true,'QA missing FOB review');RAISE EXCEPTION 'export without FOB allowed';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 r:=public.b2b_save_release(a,product,0,facts->>'fingerprint',true,false,'QA labels packaging MOQ price reviewed');
 policy:=public.b2b_set_release_policy(a,before_count,true,'QA limited release fixture only');
 facts:=public.b2b_release_availability();
 IF facts->'products'->product->>'domestic' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'catalogue release flag missing';END IF;
 lines:=jsonb_build_array(jsonb_build_object('product_id',product,'name','QA only','sku','QA','storage','ambient','quantity',1,'unit','EA','currency','KRW','tax_code','vat10','ea_per_unit',1,'price_version_id',price,'price_version',999997,'valid_until',now()+interval '1 day','unit_net_minor',1000,'unit_tax_minor',100,'unit_total_minor',1100,'net_minor',1000,'tax_minor',100,'total_minor',1100));
 delivery:='{"recipient":"QA only","phone":"01000000000","postal_code":"12345","address":"QA rollback only"}';
 id1:=public.b2b_order_submit(buyer,NULL,k,repeat('a',64),delivery,'{}',lines);
 BEGIN INSERT INTO public.b2b_pi_documents(snapshot) VALUES(jsonb_build_object('kind','proforma_invoice','lines',lines));RAISE EXCEPTION 'unapproved export issued';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 UPDATE public.products SET storage='QA changed cold chain' WHERE id=product;
 BEGIN PERFORM public.b2b_order_submit(buyer,NULL,gen_random_uuid(),repeat('a',64),delivery,'{}',lines);RAISE EXCEPTION 'changed product allowed';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 IF public.b2b_order_submit(buyer,NULL,k,repeat('a',64),delivery,'{}',lines)<>id1 THEN RAISE EXCEPTION 'replay blocked by release withdrawal';END IF;
 facts:=public.b2b_release_availability();
 IF facts->'products'->product->>'domestic' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'changed catalogue remains purchasable';END IF;
 facts:=public.b2b_release_facts(product);
 BEGIN PERFORM public.b2b_save_release(a,product,0,facts->>'fingerprint',true,false,'QA stale approval');RAISE EXCEPTION 'stale allowed';EXCEPTION WHEN serialization_failure THEN NULL;END;
 r:=public.b2b_save_release(a,product,r.revision,facts->>'fingerprint',false,false,'QA withdraw new commerce approval');
 BEGIN PERFORM public.b2b_order_submit(buyer,NULL,gen_random_uuid(),repeat('a',64),delivery,'{}',lines);RAISE EXCEPTION 'withdrawn product sold';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 IF has_function_privilege('authenticated','public.b2b_save_release(uuid,text,integer,text,boolean,boolean,text)','EXECUTE') OR has_table_privilege('anon','public.b2b_product_releases','SELECT') THEN RAISE EXCEPTION 'release access leaked';END IF;
END $$;
