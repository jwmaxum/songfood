-- B2B-01. Apply after schema.sql and 20260928_commercial_inquiries.sql in a DEVELOPMENT project first.
-- Additive membership schema; no seed users or staff role grants. Existing business data is preserved.
-- Customer and company activation is automatic after verified email. Company registration is optional.
BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('domestic','overseas')),
  country text NOT NULL CHECK (length(country) BETWEEN 2 AND 100),
  registration_no text CHECK (registration_no IS NULL OR length(registration_no) BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','suspended')),
  created_by uuid NOT NULL REFERENCES public.customer_accounts(id),
  reviewed_by uuid REFERENCES auth.users(id),
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid NOT NULL UNIQUE REFERENCES public.customer_accounts(id),
  role text NOT NULL CHECK (role IN ('owner','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(company_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.b2b_sessions (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('customer','staff')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS b2b_sessions_expiry ON public.b2b_sessions(expires_at);
CREATE TABLE IF NOT EXISTS public.b2b_rate_limits (
  bucket_key text PRIMARY KEY, window_start timestamptz NOT NULL, hits integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.b2b_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  company_id uuid REFERENCES public.companies(id),
  subject_id uuid,
  action text NOT NULL,
  previous_status text,
  new_status text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commercial_inquiries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.commercial_inquiries ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS commercial_inquiries_submitter ON public.commercial_inquiries(submitted_by,created_at DESC);
CREATE INDEX IF NOT EXISTS commercial_inquiries_company ON public.commercial_inquiries(company_id,created_at DESC);

-- New membership tables are private from creation.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_accounts','companies','company_members','b2b_sessions','b2b_rate_limits','b2b_access_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;
-- New public signup must not permit legacy self-assignment of staff roles.
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.user_profiles;
REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.user_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.b2b_consume_rate_limit(p_key text, p_limit integer, p_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer; start_at timestamptz;
BEGIN
  IF p_limit < 1 OR p_seconds < 1 OR p_seconds > 86400 THEN RAISE EXCEPTION 'invalid limit'; END IF;
  start_at := to_timestamp(floor(extract(epoch FROM now()) / p_seconds) * p_seconds);
  INSERT INTO b2b_rate_limits(bucket_key,window_start,hits) VALUES(p_key,start_at,1)
  ON CONFLICT(bucket_key) DO UPDATE SET
    window_start = excluded.window_start,
    hits = CASE WHEN b2b_rate_limits.window_start = excluded.window_start THEN b2b_rate_limits.hits + 1 ELSE 1 END
  RETURNING hits INTO n;
  DELETE FROM b2b_rate_limits WHERE window_start < now() - interval '2 days';
  DELETE FROM b2b_sessions WHERE expires_at < now();
  RETURN n <= p_limit;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_apply_company(
  p_actor uuid, p_name text, p_kind text, p_country text, p_registration_no text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE new_id uuid;
BEGIN
  PERFORM 1 FROM customer_accounts WHERE id = p_actor AND status = 'active' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id = p_actor AND email_confirmed_at IS NOT NULL)
    THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  IF EXISTS(SELECT 1 FROM company_members WHERE user_id = p_actor)
    THEN RAISE EXCEPTION 'already a member' USING ERRCODE = '23505'; END IF;
  INSERT INTO companies(name,kind,country,registration_no,created_by)
    VALUES(p_name,p_kind,p_country,NULLIF(trim(p_registration_no),''),p_actor) RETURNING id INTO new_id;
  INSERT INTO company_members(company_id,user_id,role) VALUES(new_id,p_actor,'owner');
  INSERT INTO b2b_access_audit(actor_id,company_id,action,new_status)
    VALUES(p_actor,new_id,'company_registered','approved');
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.b2b_add_company_member(p_actor uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; target_id uuid;
BEGIN
  SELECT c.id INTO cid FROM companies c JOIN company_members m ON m.company_id = c.id
    JOIN customer_accounts a ON a.id = m.user_id
    WHERE m.user_id = p_actor AND m.role = 'owner' AND m.status = 'active'
      AND c.status = 'approved' AND a.status = 'active' FOR UPDATE OF c;
  IF cid IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT a.id INTO target_id FROM customer_accounts a JOIN auth.users u ON u.id = a.id
    WHERE lower(u.email) = lower(p_email) AND a.status = 'active' AND u.email_confirmed_at IS NOT NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now()) FOR UPDATE OF a;
  IF target_id IS NULL THEN RAISE EXCEPTION 'unavailable member' USING ERRCODE = '22023'; END IF;
  -- A registered user explicitly requests joining before an owner can accept them.
  IF NOT EXISTS(SELECT 1 FROM company_join_requests WHERE company_id = cid AND user_id = target_id AND status = 'pending')
    THEN RAISE EXCEPTION 'no join request' USING ERRCODE = '22023'; END IF;
  INSERT INTO company_members(company_id,user_id,role) VALUES(cid,target_id,'member');
  UPDATE company_join_requests SET status = 'accepted' WHERE company_id = cid AND user_id = target_id;
  INSERT INTO b2b_access_audit(actor_id,company_id,subject_id,action,new_status)
    VALUES(p_actor,cid,target_id,'member_added','active');
END $$;

CREATE TABLE IF NOT EXISTS public.company_join_requests (
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid NOT NULL REFERENCES public.customer_accounts(id),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(company_id,user_id)
);
ALTER TABLE public.company_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_join_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.company_join_requests TO service_role;

CREATE OR REPLACE FUNCTION public.b2b_review_access(
  p_actor uuid, p_company uuid, p_status text, p_reason text, p_member uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE old_status text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id = p_actor AND role = 'admin' AND status = 'active')
    THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  IF length(trim(p_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'reason required' USING ERRCODE = '22023'; END IF;
  IF p_member IS NULL THEN
    IF p_status NOT IN ('approved','rejected','suspended') THEN RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023'; END IF;
    SELECT status INTO old_status FROM companies WHERE id = p_company FOR UPDATE;
    IF old_status IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
    UPDATE companies SET status = p_status, review_reason = p_reason, reviewed_by = p_actor, reviewed_at = now() WHERE id = p_company;
  ELSE
    IF p_status NOT IN ('active','suspended') THEN RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023'; END IF;
    SELECT status INTO old_status FROM company_members WHERE company_id = p_company AND user_id = p_member FOR UPDATE;
    IF old_status IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
    UPDATE company_members SET status = p_status WHERE company_id = p_company AND user_id = p_member;
  END IF;
  INSERT INTO b2b_access_audit(actor_id,company_id,subject_id,action,previous_status,new_status,reason)
    VALUES(p_actor,p_company,p_member,CASE WHEN p_member IS NULL THEN 'company_reviewed' ELSE 'member_reviewed' END,old_status,p_status,p_reason);
END $$;

-- SECURITY DEFINER helpers are callable by the server service role only.
REVOKE ALL ON FUNCTION public.b2b_consume_rate_limit(text,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.b2b_apply_company(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.b2b_add_company_member(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.b2b_review_access(uuid,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_consume_rate_limit(text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_apply_company(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_add_company_member(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.b2b_review_access(uuid,uuid,text,text,uuid) TO service_role;
CREATE TABLE IF NOT EXISTS public.b2b_schema_versions(id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.b2b_schema_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_schema_versions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.b2b_schema_versions TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20260929_b2b_identity_security'),('20260929_personal_membership') ON CONFLICT DO NOTHING;
COMMIT;
