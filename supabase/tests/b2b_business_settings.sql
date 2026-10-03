-- Caller wraps this file and the migration in BEGIN / ROLLBACK.
DO $$
DECLARE a uuid:=gen_random_uuid();s uuid:=gen_random_uuid();before_row public.b2b_business_settings;after_row public.b2b_business_settings;v jsonb;n integer;
BEGIN
 IF has_table_privilege('anon','public.b2b_business_settings','SELECT') OR has_table_privilege('authenticated','public.b2b_business_settings','UPDATE')
 OR has_table_privilege('authenticated','public.b2b_business_settings_audit','SELECT')
 OR has_function_privilege('anon','public.b2b_save_business_settings(uuid,integer,jsonb,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.b2b_save_business_settings(uuid,integer,jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'public settings access leaked';END IF;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at)
 SELECT u,u||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[a,s])u;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(a,a||'@example.invalid','QA admin','admin','active'),(s,s||'@example.invalid','QA product','product_staff','active');
 SELECT * INTO before_row FROM public.b2b_business_settings WHERE id=true;
 v:=jsonb_set(before_row.profile,'{owner}','"ROLLBACK QA OWNER"');
 BEGIN PERFORM public.b2b_save_business_settings(s,before_row.revision,v,'QA rejected role');RAISE EXCEPTION 'staff changed profile';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 after_row:=public.b2b_save_business_settings(a,before_row.revision,v,'QA approved edit');
 IF after_row.revision<>before_row.revision+1 OR after_row.profile->>'owner'<>'ROLLBACK QA OWNER' THEN RAISE EXCEPTION 'save failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.b2b_business_settings_audit WHERE actor_id=a AND revision=after_row.revision AND before_profile=before_row.profile AND after_profile=v) THEN RAISE EXCEPTION 'missing audit';END IF;
 BEGIN PERFORM public.b2b_save_business_settings(a,before_row.revision,v,'QA stale edit');RAISE EXCEPTION 'stale overwrite';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM public.b2b_save_business_settings(a,after_row.revision,v||'{"secret":"not permitted"}','QA unknown field');RAISE EXCEPTION 'unknown field accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_save_business_settings(a,after_row.revision,jsonb_set(v,'{owner}','"<script>alert(1)</script>"'),'QA markup');RAISE EXCEPTION 'markup accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_save_business_settings(a,after_row.revision,jsonb_set(v,'{email}','""'),'QA missing contact');RAISE EXCEPTION 'required field accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 UPDATE public.user_profiles SET status='suspended' WHERE id=a;
 BEGIN PERFORM public.b2b_save_business_settings(a,after_row.revision,v,'QA suspended');RAISE EXCEPTION 'suspended admin';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 SELECT count(*) INTO n FROM public.b2b_business_settings_audit WHERE actor_id=a;
 IF n<>1 THEN RAISE EXCEPTION 'rejected action wrote audit';END IF;
END $$;
