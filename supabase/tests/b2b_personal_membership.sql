-- Integration assertions. All fixtures and mutations are rolled back; no email is sent.
BEGIN;
DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  ca uuid; cb uuid; bucket text := 'b2b-test-' || gen_random_uuid(); denied boolean := false;
BEGIN
  INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at)
    VALUES(a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
          (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
          (c,c::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
  INSERT INTO public.customer_accounts(id,email,name)
    VALUES(a,a::text||'@example.invalid','Personal A'),(b,b::text||'@example.invalid','Company B'),(c,c::text||'@example.invalid','Colleague');
  IF NOT EXISTS(SELECT 1 FROM public.customer_accounts WHERE id=a AND status='active')
    THEN RAISE EXCEPTION 'Personal account not active by default'; END IF;
  ca := public.b2b_apply_company(a,'Optional company A','domestic','KR',NULL);
  cb := public.b2b_apply_company(b,'Optional company B','overseas','US','');
  IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id=ca AND status='approved' AND registration_no IS NULL)
    THEN RAISE EXCEPTION 'Company must activate without business number'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id=cb AND registration_no IS NULL)
    THEN RAISE EXCEPTION 'Blank registration number must normalize to null'; END IF;
  BEGIN
    PERFORM public.b2b_add_company_member(a,c::text||'@example.invalid');
  EXCEPTION WHEN invalid_parameter_value THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Joining without consent must fail'; END IF;
  INSERT INTO public.company_join_requests(company_id,user_id) VALUES(ca,c);
  PERFORM public.b2b_add_company_member(a,c::text||'@example.invalid');
  IF NOT EXISTS(SELECT 1 FROM public.company_members WHERE company_id=ca AND user_id=c AND role='member')
    THEN RAISE EXCEPTION 'Consented member must join'; END IF;
  denied := false;
  BEGIN
    PERFORM public.b2b_review_access(a,cb,'suspended','forged admin',NULL);
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Customer must not administer another company'; END IF;
  IF NOT public.b2b_consume_rate_limit(bucket,2,60) OR NOT public.b2b_consume_rate_limit(bucket,2,60)
    OR public.b2b_consume_rate_limit(bucket,2,60) THEN RAISE EXCEPTION 'Rate limit failed'; END IF;
  IF has_table_privilege('authenticated','public.user_profiles','UPDATE') THEN
    RAISE EXCEPTION 'Self staff-role escalation is possible'; END IF;
END $$;
ROLLBACK;
