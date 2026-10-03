DO $$
DECLARE t text; r text;
BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_inquiries','user_profiles','orders','rfq_requests','payments','products'] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
        RAISE EXCEPTION 'Unexpected legacy privilege: % %',r,t;
      END IF;
    END LOOP;
  END LOOP;
END $$;
