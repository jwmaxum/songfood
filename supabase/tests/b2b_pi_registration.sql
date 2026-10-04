-- Executed only in BEGIN / ROLLBACK. No actual company, trade or mail is created.
DO $$
DECLARE a uuid:=gen_random_uuid();staff uuid:=gen_random_uuid();r public.b2b_pi_settings;v integer;documents bigint;inquiries bigint;notifications bigint;
 seller jsonb:='{"name":"ROLLBACK ONLY","address":"ROLLBACK ONLY","email":"rollback@example.invalid","phone":"ROLLBACK ONLY","payment_terms":"ROLLBACK ONLY","bank_details":"NO REAL ACCOUNT"}';
BEGIN
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) VALUES(a,a||'@example.invalid','authenticated','authenticated',now(),now(),now()),(staff,staff||'@example.invalid','authenticated','authenticated',now(),now(),now());
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(a,a||'@example.invalid','Rollback admin','admin','active'),(staff,staff||'@example.invalid','Rollback inquiry','inquiry_staff','active');
 SELECT coalesce((SELECT revision FROM public.b2b_pi_settings WHERE id),0) INTO v;
 SELECT count(*) INTO documents FROM public.b2b_pi_documents;
 SELECT count(*) INTO inquiries FROM public.commercial_inquiries;
 SELECT count(*) INTO notifications FROM public.b2b_notification_outbox;
 IF has_function_privilege('anon','public.b2b_pi_save_settings(uuid,integer,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.b2b_pi_save_settings(uuid,integer,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'public settings save permission';END IF;
 BEGIN PERFORM public.b2b_pi_save_settings(staff,v,seller);RAISE EXCEPTION 'inquiry staff saved settings';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 SELECT * INTO r FROM public.b2b_pi_save_settings(a,v,seller);
 IF r.revision<>v+1 OR r.data<>seller OR r.updated_by<>a THEN RAISE EXCEPTION 'settings revision or actor mismatch';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.b2b_pi_events WHERE actor_id=a AND event='settings' AND document_id IS NULL) THEN RAISE EXCEPTION 'standalone audit missing';END IF;
 BEGIN PERFORM public.b2b_pi_save_settings(a,v,seller||'{"name":"STALE"}');RAISE EXCEPTION 'stale overwrite';EXCEPTION WHEN serialization_failure THEN NULL;END;
 IF documents<>(SELECT count(*) FROM public.b2b_pi_documents) OR inquiries<>(SELECT count(*) FROM public.commercial_inquiries) OR notifications<>(SELECT count(*) FROM public.b2b_notification_outbox) THEN RAISE EXCEPTION 'registration created a trade or notification';END IF;
END $$;
