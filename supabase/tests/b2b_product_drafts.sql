-- Caller must wrap in BEGIN/ROLLBACK. No QA data persists.
DO $$
DECLARE actor uuid:=gen_random_uuid();staff uuid:=gen_random_uuid();bad uuid:=gen_random_uuid();d public.b2b_product_drafts;edit public.b2b_product_drafts;other public.b2b_product_drafts;result jsonb;snapshot jsonb;pid text;sku text:='QA-DRAFT-'||gen_random_uuid()::text;before_products integer;before_prices integer;before_releases integer;
BEGIN
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT id,id||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[actor,staff,bad])id;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(actor,actor||'@example.invalid','QA draft admin','admin','active'),(staff,staff||'@example.invalid','QA draft editor','product_staff','active'),(bad,bad||'@example.invalid','QA draft inquiry','inquiry_staff','active');
 SELECT count(*) INTO before_products FROM public.products;SELECT count(*) INTO before_prices FROM public.b2b_price_revisions;SELECT count(*) INTO before_releases FROM public.b2b_product_releases;
 BEGIN PERFORM public.b2b_save_product_draft(bad,NULL,NULL,0,NULL,'{}','{}','QA forbidden');RAISE EXCEPTION 'inquiry role wrote draft';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.b2b_product_draft_validate('{"id":"spoofed"}','{}');RAISE EXCEPTION 'unknown field accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_product_draft_validate('{}','{"source_secret":"private"}');RAISE EXCEPTION 'unknown source accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 d:=public.b2b_save_product_draft(staff,NULL,NULL,0,NULL,'{"name":"QA incomplete only"}','{"specification":"QA private supplier specification"}','QA partial save');
 IF d.revision<>1 OR d.data<>'{"name":"QA incomplete only"}'::jsonb OR d.base_product IS NOT NULL OR d.base_hash IS NOT NULL THEN RAISE EXCEPTION 'private draft defaults fabricated';END IF;
 IF (SELECT count(*) FROM public.products)<>before_products THEN RAISE EXCEPTION 'private draft leaked to public products';END IF;
 BEGIN PERFORM public.b2b_publish_product_draft(staff,d.id,d.revision,'QA incomplete publish');RAISE EXCEPTION 'incomplete identity published';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_save_product_draft(staff,d.id,NULL,0,NULL,'{"storage":"stale"}','{}','QA stale save');RAISE EXCEPTION 'stale revision wrote draft';EXCEPTION WHEN serialization_failure THEN NULL;END;
 d:=public.b2b_save_product_draft(staff,d.id,NULL,d.revision,NULL,jsonb_build_object('sku',sku,'collection','K-만두/냉동식품','category','만두 & 교자'),'{"label":"QA label not supplied yet"}','QA identity completed');
 IF d.data->>'name'<>'QA incomplete only' OR d.source_notes->>'specification'<>'QA private supplier specification' THEN RAISE EXCEPTION 'sparse save lost earlier text';END IF;
 result:=public.b2b_publish_product_draft(staff,d.id,d.revision,'QA explicit catalogue publish');pid:=result->'product'->>'id';
 IF result->'draft'->>'status'<>'published' OR pid IS NULL THEN RAISE EXCEPTION 'publication missing';END IF;
 IF EXISTS(SELECT 1 FROM public.products WHERE id=pid AND (price IS NOT NULL OR stock IS NOT NULL OR carton_qty IS NOT NULL OR format IS NOT NULL OR image_url IS NOT NULL OR manufacturer IS NOT NULL OR certifications IS NOT NULL)) THEN RAISE EXCEPTION 'publication fabricated unknown facts';END IF;
 IF (result->'product')?'source_notes' OR (result->'product')?'base_product' THEN RAISE EXCEPTION 'private source leaked';END IF;
 IF (SELECT count(*) FROM public.b2b_price_revisions)<>before_prices OR (SELECT count(*) FROM public.b2b_product_releases)<>before_releases THEN RAISE EXCEPTION 'catalogue publication approved commerce';END IF;
 snapshot:=public.b2b_product_draft_snapshot(actor,NULL,pid);
 BEGIN PERFORM public.b2b_save_product_draft(actor,NULL,pid,0,repeat('a',64),'{"storage":""}','{}','QA stale first base');RAISE EXCEPTION 'stale first edit accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 edit:=public.b2b_save_product_draft(actor,NULL,pid,0,snapshot->>'base_hash','{"storage":""}','{"sales_terms":"QA private terms"}','QA existing partial clear');
 UPDATE public.products SET brand='QA concurrent edit' WHERE id=pid;
 BEGIN PERFORM public.b2b_publish_product_draft(actor,edit.id,edit.revision,'QA stale publication');RAISE EXCEPTION 'stale product overwritten';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM public.b2b_save_product_draft(actor,edit.id,pid,edit.revision,repeat('b',64),'{}','{}','QA stale rebase',true);RAISE EXCEPTION 'stale rebase accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 snapshot:=public.b2b_product_draft_snapshot(actor,NULL,pid);
 edit:=public.b2b_save_product_draft(actor,edit.id,pid,edit.revision,snapshot->>'base_hash','{"name_en":"QA reviewed name"}','{}','QA explicit fresh rebase',true);
 IF edit.data->>'storage'<>'' OR edit.base_product->>'brand'<>'QA concurrent edit' OR edit.source_notes->>'sales_terms'<>'QA private terms' THEN RAISE EXCEPTION 'rebase lost private work';END IF;
 result:=public.b2b_publish_product_draft(actor,edit.id,edit.revision,'QA reviewed partial publish');
 IF result->'product'->>'storage'<>'' OR result->'product'->>'brand'<>'QA concurrent edit' OR result->'product'->>'name'<>'QA incomplete only' THEN RAISE EXCEPTION 'partial update lost current untouched values';END IF;
 other:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,jsonb_build_object('name','QA duplicate','sku','  '||lower(sku)||'  ','collection','K-만두/냉동식품','category','만두 & 교자'),'{}','QA duplicate attempt');
 BEGIN PERFORM public.b2b_publish_product_draft(actor,other.id,other.revision,'QA duplicate publish');RAISE EXCEPTION 'normalized duplicate SKU published';EXCEPTION WHEN unique_violation THEN NULL;END;
 IF NOT EXISTS(SELECT 1 FROM public.b2b_product_draft_events WHERE draft_id=edit.id AND event='rebase' AND actor_id=actor) OR NOT EXISTS(SELECT 1 FROM public.b2b_product_draft_events WHERE draft_id=edit.id AND event='publish') THEN RAISE EXCEPTION 'draft audit missing';END IF;
 BEGIN DELETE FROM public.b2b_product_draft_events WHERE draft_id=edit.id;RAISE EXCEPTION 'audit deleted';EXCEPTION WHEN raise_exception THEN IF SQLERRM='audit deleted' THEN RAISE;END IF;END;
 IF has_table_privilege('anon','public.b2b_product_drafts','SELECT') OR has_table_privilege('authenticated','public.b2b_product_draft_events','SELECT') OR has_function_privilege('authenticated','public.b2b_save_product_draft(uuid,uuid,text,integer,text,jsonb,jsonb,text,boolean)','EXECUTE') THEN RAISE EXCEPTION 'private draft permissions leaked';END IF;
END $$;
