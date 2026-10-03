-- B2B-01 deployment cutover. Apply WITH the new server-authorized app deployment.
-- Existing public product browser reads will stop: do not apply alone to the old live site.
BEGIN;
-- All personal/transaction/role data is accessed through authorized server APIs.
-- RLS + privilege revocation also closes permissive legacy self-role/order insertion policies.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_accounts','companies','company_members','b2b_sessions',
    'b2b_rate_limits','b2b_access_audit','commercial_inquiries','user_profiles','orders',
    'rfq_requests','payments','contact_inquiries','products'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['menus','hero_slides','content_blocks','media_library','food_labels','label_ingredients','label_nutritions','label_compliance_logs'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated',t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
    END IF;
  END LOOP;
  IF to_regclass('public.food_labels') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access labels" ON public.food_labels;
  END IF;
END $$;

-- Legacy schema had a journal FOR ALL USING(true) policy. Retain public published reads only.
DROP POLICY IF EXISTS "Admin Full Access Journal Articles" ON public.journal_articles;
DROP POLICY IF EXISTS "Public Read Journal Articles" ON public.journal_articles;
DROP POLICY IF EXISTS "Public Read Published Journal Articles" ON public.journal_articles;
DROP POLICY IF EXISTS b2b_published_journal ON public.journal_articles;
CREATE POLICY b2b_published_journal ON public.journal_articles FOR SELECT TO anon, authenticated USING (is_published = true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.journal_articles FROM anon, authenticated;


INSERT INTO public.b2b_schema_versions(id) VALUES('20260930_b2b_legacy_access_lockdown') ON CONFLICT DO NOTHING;
COMMIT;
