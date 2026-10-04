-- Run only in caller BEGIN/ROLLBACK. No SMTP request and no persisted customer fixtures.
DO $$
DECLARE a uuid:=gen_random_uuid();s uuid:=gen_random_uuid();c uuid:=gen_random_uuid();inquiry uuid;n uuid;p jsonb;r jsonb;d public.b2b_email_deliveries;k uuid:=gen_random_uuid();sig text;
BEGIN
 FOREACH sig IN ARRAY ARRAY['b2b_email_deliveries','b2b_email_events','b2b_mail_transport'] LOOP
 IF has_table_privilege('anon','public.'||sig,'SELECT') OR has_table_privilege('authenticated','public.'||sig,'SELECT') THEN RAISE EXCEPTION 'mail leak';END IF;
 END LOOP;
 IF has_function_privilege('anon','public.b2b_mail_prepare(uuid,uuid,text,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'public mail RPC';END IF;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT u,u||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[a,s,c])u;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(a,a||'@example.invalid','QA mail admin','admin','active'),(s,s||'@example.invalid','QA mail staff','inquiry_staff','active');
 INSERT INTO public.customer_accounts(id,email,name) VALUES(c,c||'@example.invalid','QA buyer');
 p:=jsonb_build_object('kind','domestic_wholesale','company','QA rollback','contact_name','QA','email','unverified-form@example.invalid','submitted_by',c);
 r:=public.b2b_submit_inquiry(repeat('a',64),gen_random_uuid(),repeat('b',64),p);inquiry:=(r->>'id')::uuid;
 SELECT id INTO n FROM public.b2b_notification_outbox WHERE inquiry_id=inquiry;
 r:=public.b2b_mail_prepare(a,n);
 IF r->'payload'->>'recipient' IS DISTINCT FROM c||'@example.invalid' THEN RAISE EXCEPTION 'freeform recipient used';END IF;
 BEGIN PERFORM public.b2b_mail_prepare(c,n);RAISE EXCEPTION 'customer mail bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM public.b2b_mail_verify(a,true,'https://song-food.jwmaxum.workers.dev');
 r:=public.b2b_mail_prepare(a,n,'send',k,r->>'hash','QA claim only no SMTP');
 IF r->>'claimed'<>'true' THEN RAISE EXCEPTION 'claim missing';END IF;
 SELECT * INTO d FROM public.b2b_email_deliveries WHERE notification_id=n;
 r:=public.b2b_mail_prepare(a,n,'send',k,r->>'hash','QA replay');
 IF r->>'claimed'<>'false' OR (SELECT attempt FROM public.b2b_email_deliveries WHERE notification_id=n)<>1 THEN RAISE EXCEPTION 'send replay duplicated';END IF;
 BEGIN PERFORM public.b2b_mail_finish(a,n,gen_random_uuid(),'accepted','SMTP_ACCEPTED');RAISE EXCEPTION 'lease bypass';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM public.b2b_mail_finish(a,n,d.token,'uncertain','SEND_OUTCOME_UNKNOWN');
 BEGIN PERFORM public.b2b_mail_prepare(s,n,'reset',NULL,NULL,'QA checked sent folder');RAISE EXCEPTION 'staff reset bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 r:=public.b2b_mail_prepare(a,n);
 BEGIN PERFORM public.b2b_mail_prepare(a,n,'send',gen_random_uuid(),r->>'hash','QA blind retry');RAISE EXCEPTION 'uncertain retry allowed';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM public.b2b_mail_prepare(a,n,'reset',NULL,NULL,'QA checked sent folder and recipient');
 r:=public.b2b_mail_prepare(a,n);
 r:=public.b2b_mail_prepare(a,n,'send',gen_random_uuid(),r->>'hash','QA second claim only');
 SELECT * INTO d FROM public.b2b_email_deliveries WHERE notification_id=n;
 UPDATE public.b2b_email_deliveries SET lease_until=now()-interval '1 second' WHERE notification_id=n;
 r:=public.b2b_mail_prepare(a,n);
 IF r->'delivery'->>'state'<>'uncertain' THEN RAISE EXCEPTION 'expired lease not isolated';END IF;
 PERFORM public.b2b_mail_prepare(a,n,'reset',NULL,NULL,'QA verified no duplicate second send');
 r:=public.b2b_mail_prepare(a,n);
 UPDATE auth.users SET email='changed@example.invalid' WHERE id=c;
 BEGIN PERFORM public.b2b_mail_prepare(a,n,'send',gen_random_uuid(),r->>'hash','QA stale recipient');RAISE EXCEPTION 'stale recipient sent';EXCEPTION WHEN serialization_failure THEN NULL;END;
 UPDATE public.customer_accounts SET status='suspended' WHERE id=c;
 BEGIN PERFORM public.b2b_mail_prepare(a,n);RAISE EXCEPTION 'inactive recipient';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN UPDATE public.b2b_email_events SET code='tamper' WHERE notification_id=n;RAISE EXCEPTION 'mutable mail audit';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CRM history is immutable' THEN RAISE;END IF;END;
END $$;
