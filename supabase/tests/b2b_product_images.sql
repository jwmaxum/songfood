-- Caller wraps all QA fixtures in BEGIN/ROLLBACK; no real catalogue edits are retained.
DO $$
DECLARE actor uuid:=gen_random_uuid();bad uuid:=gen_random_uuid();d public.b2b_product_drafts;s jsonb;r jsonb;p jsonb;pid text;payload jsonb;prices integer;releases integer;url1 text:='https://example.invalid/photo-1.png';url2 text:='/images/products/photo-2.jpg';
BEGIN
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT id,id||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[actor,bad])id;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(actor,actor||'@example.invalid','QA image editor','product_staff','active'),(bad,bad||'@example.invalid','QA unauthorized','inquiry_staff','active');
 SELECT count(*) INTO prices FROM public.b2b_price_revisions;SELECT count(*) INTO releases FROM public.b2b_product_releases;
 FOR payload IN SELECT value FROM jsonb_array_elements('["not-array",{},[null],[1],[""],["//example.invalid/x"],["http://example.invalid/x"],["https://user:pass@example.invalid/x"],["/a b"],["/a\\b"],["/a","/a"],["/1","/2","/3","/4","/5","/6","/7"]]'::jsonb) LOOP
  BEGIN PERFORM public.b2b_product_draft_validate(jsonb_build_object('images',payload),'{}');RAISE EXCEPTION 'invalid gallery accepted: %',payload;EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 END LOOP;
 IF public.b2b_product_images_valid(jsonb_build_array('/images/caf'||chr(233)||'.jpg','/images/cafe'||chr(769)||'.jpg')) THEN RAISE EXCEPTION 'normalized duplicate accepted';END IF;
 d:=public.b2b_save_product_draft(actor,NULL,NULL,0,NULL,jsonb_build_object('name','QA gallery sparse product','images',jsonb_build_array(url1,url2)),'{"label":"QA private label"}','QA uploaded images draft');
 s:=public.b2b_product_draft_snapshot(actor,d.id,NULL);IF s->'draft'->'data'->'images' IS DISTINCT FROM jsonb_build_array(url1,url2) THEN RAISE EXCEPTION 'gallery not persisted in draft';END IF;
 BEGIN PERFORM public.b2b_publish_product_draft(bad,d.id,d.revision,'QA unauthorized image update');RAISE EXCEPTION 'unqualified published photos';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA images publication');p:=r->'product';pid:=p->>'id';
 IF p->>'image_url'<>url1 OR p->'images' IS DISTINCT FROM jsonb_build_array(url1,url2) OR p?'source_notes' OR p->'price'<>'null'::jsonb THEN RAISE EXCEPTION 'gallery publication invalid';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,pid);d:=public.b2b_save_product_draft(actor,NULL,pid,0,s->>'base_hash',jsonb_build_object('image_url',url2),'{}','QA representative-only replacement');
 r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA representative photo first');p:=r->'product';
 IF p->>'image_url'<>url2 OR p->'images' IS DISTINCT FROM jsonb_build_array(url2,url1) THEN RAISE EXCEPTION 'representative not synchronized or extra photo lost';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,pid);d:=public.b2b_save_product_draft(actor,NULL,pid,0,s->>'base_hash','{"description":"QA unrelated edit"}','{}','QA no photo patch');r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA preserve photos');
 IF r->'product'->'images' IS DISTINCT FROM p->'images' OR r->'product'->>'image_url'<>url2 THEN RAISE EXCEPTION 'non-photo edit modified gallery';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,pid);d:=public.b2b_save_product_draft(actor,NULL,pid,0,s->>'base_hash','{"images":[]}','{}','QA explicitly clear gallery');r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA clear image references');
 IF r->'product'->'images'<>'[]'::jsonb OR r->'product'->'image_url'<>'null'::jsonb THEN RAISE EXCEPTION 'gallery clear not synchronized';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,pid);d:=public.b2b_save_product_draft(actor,NULL,pid,0,s->>'base_hash','{"images":null}','{}','QA nullable clear');r:=public.b2b_publish_product_draft(actor,d.id,d.revision,'QA clear null gallery');
 IF r->'product'->'images'<>'[]'::jsonb OR r->'product'->'image_url'<>'null'::jsonb THEN RAISE EXCEPTION 'null gallery clear invalid';END IF;
 s:=public.b2b_product_draft_snapshot(actor,NULL,pid);d:=public.b2b_save_product_draft(actor,NULL,pid,0,s->>'base_hash',jsonb_build_object('images',jsonb_build_array(url1)),'{}','QA stale photo draft');
 UPDATE public.products SET images=jsonb_build_array(url2),image_url=url2 WHERE id=pid;
 BEGIN PERFORM public.b2b_publish_product_draft(actor,d.id,d.revision,'QA stale photo conflict');RAISE EXCEPTION 'concurrent image edit lost';EXCEPTION WHEN serialization_failure THEN NULL;END;
 -- Nullable schema growth preserves old hashes, but an actual image edit must change the hash.
 IF public.b2b_product_fingerprint('{"id":"x"}'::jsonb)<>public.b2b_product_fingerprint('{"id":"x","images":null}'::jsonb) OR public.b2b_product_fingerprint('{"id":"x","images":[]}'::jsonb)=public.b2b_product_fingerprint('{"id":"x"}'::jsonb) THEN RAISE EXCEPTION 'legacy fingerprint compatibility failed';END IF;
 IF (SELECT count(*) FROM public.b2b_price_revisions)<>prices OR (SELECT count(*) FROM public.b2b_product_releases)<>releases THEN RAISE EXCEPTION 'image edits changed trade approvals';END IF;
 IF has_table_privilege('anon','public.media_library','SELECT') OR has_table_privilege('authenticated','public.media_library','INSERT') THEN RAISE EXCEPTION 'media library permission leaked';END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='media' AND public AND file_size_limit=52428800) OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='b2b-proforma' AND NOT public) THEN RAISE EXCEPTION 'bucket configuration changed incorrectly';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='b2b_media_server_only' AND permissive='RESTRICTIVE') THEN RAISE EXCEPTION 'media write policy missing';END IF;
END $$;
