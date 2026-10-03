-- Read-only assertions after the additive B2B-01 membership migration.
-- No test accounts, approvals or transactions are created by this script.
DO $$
DECLARE t text; r text; f text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.b2b_schema_versions WHERE id='20260929_b2b_identity_security')
    THEN RAISE EXCEPTION 'B2B-01 migration missing'; END IF;
  FOREACH t IN ARRAY ARRAY['customer_accounts','companies','company_members','company_join_requests','b2b_sessions',
    'b2b_rate_limits','b2b_access_audit'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) THEN
      RAISE EXCEPTION 'RLS disabled on %',t;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
        RAISE EXCEPTION 'Unexpected direct privilege for % on %',r,t;
      END IF;
    END LOOP;
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'public.b2b_consume_rate_limit(text,integer,integer)',
    'public.b2b_apply_company(uuid,text,text,text,text)',
    'public.b2b_add_company_member(uuid,text)',
    'public.b2b_review_access(uuid,uuid,text,text,uuid)'] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(r,f,'EXECUTE') THEN RAISE EXCEPTION 'Unsafe RPC privilege: % %',r,f; END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'Missing server RPC privilege: %',f; END IF;
  END LOOP;
END $$;
