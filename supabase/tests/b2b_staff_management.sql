-- Wrapped by BEGIN/ROLLBACK. No test accounts or assignments persist.
DO $$
DECLARE chief uuid;sub uuid:=gen_random_uuid();person uuid:=gen_random_uuid();unverified uuid:=gen_random_uuid();
v jsonb;r jsonb;c public.b2b_service_controls;
BEGIN
 SELECT user_id INTO chief FROM public.b2b_super_admin WHERE id;
 IF NOT public.b2b_is_super_admin(chief) THEN RAISE EXCEPTION 'chief not verified';END IF;
 IF has_function_privilege('anon','public.b2b_manage_staff(uuid,text,uuid,text,integer,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.b2b_staff_snapshot(uuid)','EXECUTE')
 OR has_table_privilege('authenticated','public.b2b_staff_events','SELECT')
 OR has_table_privilege('service_role','public.b2b_super_admin','UPDATE') THEN RAISE EXCEPTION 'staff privileges exposed';END IF;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT id,id||'@example.invalid','authenticated','authenticated',CASE WHEN id=unverified THEN NULL ELSE now() END,now(),now() FROM unnest(ARRAY[sub,person,unverified]) id;
 r:=public.b2b_manage_staff(chief,'register',NULL,sub||'@example.invalid',NULL,'QA sub admin','admin','active','QA staff register');
 BEGIN PERFORM public.b2b_manage_staff(sub,'register',NULL,person||'@example.invalid',NULL,'QA denied','product_staff','active','QA privilege denied');RAISE EXCEPTION 'subadmin escalation';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.b2b_staff_snapshot(sub);RAISE EXCEPTION 'roster exposed to subadmin';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.b2b_manage_staff(chief,'register',NULL,unverified||'@example.invalid',NULL,'QA unverified','product_staff','active','QA verification');RAISE EXCEPTION 'unverified accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.b2b_manage_staff(chief,'register',NULL,sub||'@example.invalid',NULL,'QA duplicate','admin','active','QA duplicate');RAISE EXCEPTION 'duplicate accepted';EXCEPTION WHEN unique_violation THEN NULL;END;
 BEGIN PERFORM public.b2b_manage_staff(chief,'remove',chief,NULL,1,NULL,NULL,NULL,'QA self protection');RAISE EXCEPTION 'chief deleted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN UPDATE public.user_profiles SET role='viewer' WHERE id=chief;RAISE EXCEPTION 'chief demotion';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN DELETE FROM public.user_profiles WHERE id=chief;RAISE EXCEPTION 'chief profile deletion';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN DELETE FROM public.b2b_super_admin WHERE id;RAISE EXCEPTION 'chief binding deletion';EXCEPTION WHEN insufficient_privilege OR raise_exception THEN IF SQLERRM='chief binding deletion' THEN RAISE;END IF;END;
 r:=public.b2b_manage_staff(chief,'register',NULL,person||'@example.invalid',NULL,'QA operator','order_staff','active','QA operator register');
 INSERT INTO public.customer_accounts(id,email,name) VALUES(person,person||'@example.invalid','QA personal customer');
 INSERT INTO public.b2b_sessions(token_hash,user_id,audience,expires_at) VALUES(repeat('d',64),person,'staff',now()+interval '1 hour'),(repeat('e',64),person,'customer',now()+interval '1 hour');
 SELECT * INTO c FROM public.b2b_service_controls WHERE id;
 v:=jsonb_build_object('inquiries_paused',c.inquiries_paused,'orders_paused',c.orders_paused,'pi_paused',c.pi_paused,'owner_id',person,'response_minutes',30);
 c:=public.b2b_save_service_controls(chief,c.revision,v,'QA selected registered staff');
 IF c.owner_id<>person OR c.owner<>'QA operator' THEN RAISE EXCEPTION 'canonical owner mismatch';END IF;
 BEGIN PERFORM public.b2b_save_service_controls(chief,c.revision,v||'{"owner":"spoofed"}','QA spoof owner');RAISE EXCEPTION 'free text owner accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 r:=public.b2b_manage_staff(chief,'update',person,NULL,(r->>'revision')::integer,'QA renamed','inquiry_staff','active','QA role and name update');
 SELECT * INTO c FROM public.b2b_service_controls WHERE id;
 IF c.owner<>'QA renamed' OR c.owner_id<>person OR EXISTS(SELECT 1 FROM public.b2b_sessions WHERE user_id=person AND audience='staff')
 OR NOT EXISTS(SELECT 1 FROM public.b2b_sessions WHERE user_id=person AND audience='customer') THEN RAISE EXCEPTION 'session or owner update lost';END IF;
 BEGIN PERFORM public.b2b_manage_staff(chief,'update',person,NULL,1,'QA stale','admin','active','QA stale version');RAISE EXCEPTION 'stale accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 r:=public.b2b_manage_staff(chief,'update',person,NULL,(r->>'revision')::integer,'QA renamed','inquiry_staff','suspended','QA staff suspended');
 SELECT * INTO c FROM public.b2b_service_controls WHERE id;
 IF c.owner_id IS NOT NULL OR c.owner<>'' OR (public.b2b_staff_directory(chief)::text LIKE '%'||person::text||'%') THEN RAISE EXCEPTION 'suspended owner retained';END IF;
 BEGIN PERFORM public.b2b_save_service_controls(chief,c.revision,v,'QA suspended owner');RAISE EXCEPTION 'inactive owner accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 r:=public.b2b_manage_staff(chief,'remove',person,NULL,(r->>'revision')::integer,NULL,NULL,NULL,'QA remove staff membership');
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=person) OR NOT EXISTS(SELECT 1 FROM public.customer_accounts WHERE id=person AND status='active')
 OR (public.b2b_staff_snapshot(chief)->'data')::text LIKE '%'||person::text||'%' THEN RAISE EXCEPTION 'removal deleted customer or retained roster';END IF;
 r:=public.b2b_manage_staff(chief,'register',NULL,person||'@example.invalid',NULL,'QA restored','product_staff','active','QA re-register removed staff');
 IF (r->>'revision')::integer<>5 THEN RAISE EXCEPTION 're-registration version mismatch';END IF;
 IF (SELECT count(*) FROM public.b2b_staff_events WHERE staff_id=person)<>5 THEN RAISE EXCEPTION 'staff audit missing';END IF;
 BEGIN UPDATE public.b2b_staff_events SET reason='edited' WHERE staff_id=person;RAISE EXCEPTION 'staff audit mutable';EXCEPTION WHEN insufficient_privilege OR raise_exception THEN IF SQLERRM='staff audit mutable' THEN RAISE;END IF;END;
 IF NOT public.b2b_is_super_admin(chief) OR public.b2b_is_super_admin(sub) THEN RAISE EXCEPTION 'super role spoofed';END IF;
END $$;
