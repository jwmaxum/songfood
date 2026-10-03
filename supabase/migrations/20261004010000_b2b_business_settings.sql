-- Public business information is edited through an admin-only, revision-checked RPC.
CREATE TABLE IF NOT EXISTS public.b2b_business_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_business_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_business_settings FROM anon,authenticated;
GRANT SELECT ON public.b2b_business_settings TO service_role;
INSERT INTO public.b2b_business_settings(id,profile) VALUES(true,
 '{"name":"송영민푸드","owner":"","registration":"","ecommerce_registration":"","address":"","address_en":"","phone":"010-3889-3344","email":"3song876@daum.net","export_phone":"+82-10-2143-2120","privacy_contact":"","shipping_ko":"","shipping_en":"","returns_ko":"","returns_en":"","privacy_ko":"","privacy_en":""}'::jsonb) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.b2b_business_settings_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES auth.users(id),
 revision integer NOT NULL,reason text NOT NULL,before_profile jsonb NOT NULL,after_profile jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_business_settings_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_business_settings_audit FROM anon,authenticated;
GRANT SELECT ON public.b2b_business_settings_audit TO service_role;
CREATE OR REPLACE FUNCTION public.b2b_save_business_settings(p_actor uuid,p_revision integer,p_profile jsonb,p_reason text)
RETURNS public.b2b_business_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.b2b_business_settings; result public.b2b_business_settings; field record;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO old_row FROM public.b2b_business_settings WHERE id=true FOR UPDATE;
 IF p_revision IS DISTINCT FROM old_row.revision THEN RAISE EXCEPTION 'revision conflict' USING ERRCODE='40001';END IF;
 IF p_profile IS NULL OR jsonb_typeof(p_profile)<>'object' OR length(p_profile::text)>40000 OR coalesce(length(trim(p_reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'invalid profile' USING ERRCODE='22023';END IF;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_profile) k) IS DISTINCT FROM
 (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(old_row.profile) k) THEN RAISE EXCEPTION 'invalid fields' USING ERRCODE='22023';END IF;
 FOR field IN SELECT * FROM jsonb_each(p_profile) LOOP
   IF jsonb_typeof(field.value)<>'string' OR length(p_profile->>field.key)>6000 OR (p_profile->>field.key) ~ '[<>]' THEN RAISE EXCEPTION 'invalid field' USING ERRCODE='22023';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['name','phone','email','export_phone']) k WHERE coalesce(length(trim(p_profile->>k)),0)=0) THEN RAISE EXCEPTION 'required field' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_business_settings SET profile=p_profile,revision=revision+1,updated_at=now() WHERE id=true RETURNING * INTO result;
 INSERT INTO public.b2b_business_settings_audit(actor_id,revision,reason,before_profile,after_profile)
 VALUES(p_actor,result.revision,trim(p_reason),old_row.profile,p_profile);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.b2b_save_business_settings(uuid,integer,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_save_business_settings(uuid,integer,jsonb,text) TO service_role;
