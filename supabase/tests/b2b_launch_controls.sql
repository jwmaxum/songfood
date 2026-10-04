-- Caller wraps migration/test in BEGIN/ROLLBACK; no persisted test actors or pauses.
DO $$
DECLARE a uuid:=gen_random_uuid();s uuid:=gen_random_uuid();c public.b2b_service_controls;v jsonb;result public.b2b_service_controls;
BEGIN
 IF has_table_privilege('anon','public.b2b_service_controls','SELECT') OR has_table_privilege('authenticated','public.b2b_service_control_events','SELECT')
 OR has_function_privilege('anon','public.b2b_save_service_controls(uuid,integer,jsonb,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.b2b_launch_snapshot(uuid)','EXECUTE') THEN RAISE EXCEPTION 'controls leaked';END IF;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT u,u||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[a,s])u;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(a,a||'@example.invalid','QA admin','admin','active'),(s,s||'@example.invalid','QA staff','product_staff','active');
 SELECT * INTO c FROM public.b2b_service_controls WHERE id=true;
 v:=jsonb_build_object('inquiries_paused',true,'orders_paused',true,'pi_paused',true,'owner','QA rollback operator','response_minutes',30);
 BEGIN PERFORM public.b2b_save_service_controls(s,c.revision,v,'QA role denied');RAISE EXCEPTION 'staff bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 result:=public.b2b_save_service_controls(a,c.revision,v,'QA pause all new trades');
 IF NOT result.inquiries_paused OR NOT result.orders_paused OR NOT result.pi_paused THEN RAISE EXCEPTION 'pause lost';END IF;
 BEGIN INSERT INTO public.commercial_inquiries DEFAULT VALUES;RAISE EXCEPTION 'RFQ pause bypass';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
 BEGIN INSERT INTO public.b2b_orders DEFAULT VALUES;RAISE EXCEPTION 'order pause bypass';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
 BEGIN INSERT INTO public.b2b_pi_documents DEFAULT VALUES;RAISE EXCEPTION 'PI pause bypass';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
 BEGIN PERFORM public.b2b_save_service_controls(a,c.revision,v,'QA stale');RAISE EXCEPTION 'stale bypass';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM public.b2b_save_service_controls(a,result.revision,v||'{"role":"admin"}','QA unknown');RAISE EXCEPTION 'unknown bypass';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_save_service_controls(a,result.revision,jsonb_set(v,'{orders_paused}','"false"'),'QA string');RAISE EXCEPTION 'string bypass';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_launch_snapshot(s);RAISE EXCEPTION 'launch data bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 v:=jsonb_set(jsonb_set(jsonb_set(v,'{orders_paused}','false'),'{pi_paused}','false'),'{inquiries_paused}','false');
 result:=public.b2b_save_service_controls(a,result.revision,v,'QA resume');
 BEGIN INSERT INTO public.commercial_inquiries DEFAULT VALUES;RAISE EXCEPTION 'invalid inquiry accepted';EXCEPTION WHEN not_null_violation OR check_violation THEN NULL;END;
 IF (SELECT count(*) FROM public.b2b_service_control_events WHERE actor_id=a)<>2 THEN RAISE EXCEPTION 'audit mismatch';END IF;
 UPDATE public.user_profiles SET status='suspended' WHERE id=a;
 BEGIN PERFORM public.b2b_save_service_controls(a,result.revision,v,'QA suspended');RAISE EXCEPTION 'suspended bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
