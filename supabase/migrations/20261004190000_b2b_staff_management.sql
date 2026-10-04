-- Staff membership is separate from customer Auth. No invitation mail or Auth deletion.
BEGIN;
CREATE TABLE public.b2b_super_admin(
 id boolean PRIMARY KEY DEFAULT true CHECK(id),user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_super_admin ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_super_admin FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.b2b_super_admin TO service_role;
DO $$
DECLARE v_id uuid;v_count integer;
BEGIN
 SELECT count(*),min(id::text)::uuid INTO v_count,v_id FROM auth.users WHERE lower(email)='jwmaxum@gmail.com' AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<=now());
 IF v_count<>1 THEN RAISE EXCEPTION 'Verified designated super administrator required' USING ERRCODE='55000';END IF;
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES(v_id,'jwmaxum@gmail.com','최고관리자','admin','active')
 ON CONFLICT(id) DO UPDATE SET role='admin',status='active';
 INSERT INTO public.b2b_super_admin(user_id) VALUES(v_id);
END $$;
ALTER TABLE public.user_profiles ADD COLUMN staff_revision integer NOT NULL DEFAULT 1 CHECK(staff_revision>0),ADD COLUMN staff_removed_at timestamptz;
ALTER TABLE public.b2b_service_controls ADD COLUMN owner_id uuid REFERENCES public.user_profiles(id);
CREATE TABLE public.b2b_staff_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES public.user_profiles(id),staff_id uuid NOT NULL REFERENCES public.user_profiles(id),
 event text NOT NULL CHECK(event IN('register','update','remove')),reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 500),
 before_state jsonb,after_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_staff_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_staff_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.b2b_staff_events TO service_role;
CREATE TRIGGER b2b_staff_events_immutable BEFORE UPDATE OR DELETE ON public.b2b_staff_events FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();
CREATE TRIGGER b2b_super_admin_immutable BEFORE UPDATE OR DELETE ON public.b2b_super_admin FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();
CREATE FUNCTION public.b2b_is_super_admin(p_actor uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.b2b_super_admin s JOIN public.user_profiles p ON p.id=s.user_id JOIN auth.users a ON a.id=p.id
 WHERE s.id AND s.user_id=p_actor AND p.role='admin' AND p.status='active' AND p.staff_removed_at IS NULL
 AND lower(a.email)='jwmaxum@gmail.com' AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now()))
$$;
CREATE FUNCTION public.b2b_protect_super_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.b2b_super_admin WHERE user_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'protected super administrator' USING ERRCODE='42501';END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email OR NEW.role<>'admin' OR NEW.status<>'active' OR NEW.staff_removed_at IS NOT NULL
  THEN RAISE EXCEPTION 'protected super administrator' USING ERRCODE='42501';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
CREATE TRIGGER b2b_protect_super_admin BEFORE UPDATE OR DELETE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.b2b_protect_super_admin();
CREATE FUNCTION public.b2b_staff_directory(p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role IN('admin','product_staff','inquiry_staff','order_staff') AND staff_removed_at IS NULL)
 THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'email',a.email,'role',p.role) ORDER BY p.name,p.id)
 FROM public.user_profiles p JOIN auth.users a ON a.id=p.id WHERE p.status='active' AND p.staff_removed_at IS NULL
 AND p.role IN('admin','product_staff','inquiry_staff','order_staff') AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now())),'[]'::jsonb);
END $$;
CREATE FUNCTION public.b2b_staff_snapshot(p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.b2b_is_super_admin(p_actor) THEN RAISE EXCEPTION 'super administrator only' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('super_admin_id',(SELECT user_id FROM public.b2b_super_admin WHERE id),
 'data',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'email',a.email,'name',p.name,'role',p.role,'status',p.status,'revision',p.staff_revision,'created_at',p.created_at,
 'verified',a.email_confirmed_at IS NOT NULL,'auth_active',a.id IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now())) ORDER BY p.created_at DESC,p.id)
 FROM public.user_profiles p LEFT JOIN auth.users a ON a.id=p.id WHERE p.role IN('admin','product_staff','inquiry_staff','order_staff') AND p.staff_removed_at IS NULL),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM (SELECT e.id,e.staff_id,e.event,e.reason,e.created_at,e.before_state,e.after_state
 FROM public.b2b_staff_events e ORDER BY e.created_at DESC,e.id DESC LIMIT 30)e),'[]'::jsonb));
END $$;
CREATE FUNCTION public.b2b_manage_staff(p_actor uuid,p_action text,p_id uuid,p_email text,p_revision integer,p_name text,p_role text,p_status text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;v_email text;v_count integer;old_row public.user_profiles;r public.user_profiles;c public.b2b_service_controls;after_c public.b2b_service_controls;
BEGIN
 -- Same order as other business writers: identity tables before service controls.
 LOCK TABLE public.user_profiles IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE auth.users IN SHARE MODE;
 IF NOT public.b2b_is_super_admin(p_actor) THEN RAISE EXCEPTION 'super administrator only' USING ERRCODE='42501';END IF;
 IF p_action IS NULL OR p_action NOT IN('register','update','remove') OR coalesce(length(trim(p_reason)),0) NOT BETWEEN 3 AND 500 OR p_reason ~ '[<>[:cntrl:]]'
 THEN RAISE EXCEPTION 'invalid staff action' USING ERRCODE='22023';END IF;
 IF p_action='register' THEN
  IF p_id IS NOT NULL OR p_revision IS NOT NULL OR p_status IS DISTINCT FROM 'active' OR p_email IS NULL OR length(p_email)>254 THEN RAISE EXCEPTION 'invalid registration' USING ERRCODE='22023';END IF;
  SELECT count(*),min(id::text)::uuid INTO v_count,v_id FROM auth.users WHERE lower(email)=lower(trim(p_email)) AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<=now());
  IF v_count<>1 THEN RAISE EXCEPTION 'verified account required' USING ERRCODE='22023';END IF;
 ELSE
  v_id:=p_id;
  IF v_id IS NULL OR p_revision IS NULL OR p_email IS NOT NULL THEN RAISE EXCEPTION 'invalid staff version' USING ERRCODE='22023';END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.b2b_super_admin WHERE user_id=v_id) THEN RAISE EXCEPTION 'protected super administrator' USING ERRCODE='42501';END IF;
 SELECT * INTO old_row FROM public.user_profiles WHERE id=v_id FOR UPDATE;
 IF p_action='register' THEN
  IF old_row.id IS NOT NULL AND old_row.role IN('admin','product_staff','inquiry_staff','order_staff') AND old_row.staff_removed_at IS NULL THEN RAISE EXCEPTION 'already registered' USING ERRCODE='23505';END IF;
 ELSE
  IF old_row.id IS NULL OR old_row.staff_removed_at IS NOT NULL OR old_row.role NOT IN('admin','product_staff','inquiry_staff','order_staff') THEN RAISE EXCEPTION 'missing staff' USING ERRCODE='P0002';END IF;
  IF p_revision IS DISTINCT FROM old_row.staff_revision THEN RAISE EXCEPTION 'stale staff' USING ERRCODE='40001';END IF;
 END IF;
 IF p_action<>'remove' THEN
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 120 OR p_name ~ '[<>[:cntrl:]]' OR p_role IS NULL OR p_role NOT IN('admin','product_staff','inquiry_staff','order_staff')
  OR p_status IS NULL OR p_status NOT IN('active','suspended') THEN RAISE EXCEPTION 'invalid staff details' USING ERRCODE='22023';END IF;
  IF p_status='active' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_id AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<=now())) THEN RAISE EXCEPTION 'verified account required' USING ERRCODE='22023';END IF;
  SELECT email INTO v_email FROM auth.users WHERE id=v_id;
  INSERT INTO public.user_profiles(id,email,name,role,status,staff_revision) VALUES(v_id,lower(v_email),trim(p_name),p_role,p_status,1)
  ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role=EXCLUDED.role,status=EXCLUDED.status,staff_revision=user_profiles.staff_revision+1,staff_removed_at=NULL,updated_at=now() RETURNING * INTO r;
 ELSE
  UPDATE public.user_profiles SET role='viewer',status='suspended',staff_removed_at=now(),staff_revision=staff_revision+1,updated_at=now() WHERE id=v_id RETURNING * INTO r;
 END IF;
 DELETE FROM public.b2b_sessions WHERE user_id=v_id AND audience='staff';
 SELECT * INTO c FROM public.b2b_service_controls WHERE id FOR UPDATE;
 IF c.owner_id=v_id THEN
  UPDATE public.b2b_service_controls SET owner_id=CASE WHEN r.status='active' AND r.staff_removed_at IS NULL THEN v_id ELSE NULL END,
  owner=CASE WHEN r.status='active' AND r.staff_removed_at IS NULL THEN r.name ELSE '' END,revision=revision+1,updated_at=now() WHERE id RETURNING * INTO after_c;
  INSERT INTO public.b2b_service_control_events(actor_id,revision,reason,before_state,after_state) VALUES(p_actor,after_c.revision,trim(p_reason),to_jsonb(c),to_jsonb(after_c));
 END IF;
 INSERT INTO public.b2b_staff_events(actor_id,staff_id,event,reason,before_state,after_state) VALUES(p_actor,v_id,p_action,trim(p_reason),
 CASE WHEN old_row.id IS NULL THEN NULL ELSE jsonb_build_object('name',old_row.name,'role',old_row.role,'status',old_row.status,'revision',old_row.staff_revision) END,
 jsonb_build_object('name',r.name,'role',r.role,'status',r.status,'revision',r.staff_revision));
 RETURN jsonb_build_object('id',r.id,'name',r.name,'role',r.role,'status',r.status,'revision',r.staff_revision,'removed',r.staff_removed_at IS NOT NULL);
END $$;
CREATE OR REPLACE FUNCTION public.b2b_save_service_controls(p_actor uuid,p_revision integer,p_state jsonb,p_reason text)
RETURNS public.b2b_service_controls LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.b2b_service_controls;result public.b2b_service_controls;v_owner uuid;v_name text:='';
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO old_row FROM public.b2b_service_controls WHERE id=true FOR UPDATE;
 IF p_revision IS DISTINCT FROM old_row.revision THEN RAISE EXCEPTION 'revision conflict' USING ERRCODE='40001';END IF;
 IF p_state IS NULL OR jsonb_typeof(p_state)<>'object' OR
 (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_state) k) IS DISTINCT FROM ARRAY['inquiries_paused','orders_paused','owner_id','pi_paused','response_minutes']::text[]
 OR jsonb_typeof(p_state->'inquiries_paused') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_state->'orders_paused') IS DISTINCT FROM 'boolean'
 OR jsonb_typeof(p_state->'pi_paused') IS DISTINCT FROM 'boolean'
 OR (p_state->'owner_id'<>'null'::jsonb AND (jsonb_typeof(p_state->'owner_id')<>'string' OR (p_state->>'owner_id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'))
 OR (p_state->'response_minutes'<>'null'::jsonb AND (jsonb_typeof(p_state->'response_minutes')<>'number' OR (p_state->>'response_minutes') !~ '^[0-9]+$'
 OR (p_state->>'response_minutes')::numeric NOT BETWEEN 5 AND 1440))
 OR coalesce(length(trim(p_reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'invalid controls' USING ERRCODE='22023';END IF;
 v_owner:=(p_state->>'owner_id')::uuid;
 IF v_owner IS NOT NULL THEN
  SELECT p.name INTO v_name FROM public.user_profiles p JOIN auth.users a ON a.id=p.id
  WHERE p.id=v_owner AND p.status='active' AND p.staff_removed_at IS NULL AND p.role IN('admin','product_staff','inquiry_staff','order_staff') AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now());
  IF NOT FOUND THEN RAISE EXCEPTION 'active registered staff required' USING ERRCODE='22023';END IF;
 END IF;
 UPDATE public.b2b_service_controls SET revision=revision+1,inquiries_paused=(p_state->>'inquiries_paused')::boolean,
 orders_paused=(p_state->>'orders_paused')::boolean,pi_paused=(p_state->>'pi_paused')::boolean,
 owner_id=v_owner,owner=coalesce(v_name,''),response_minutes=(p_state->>'response_minutes')::integer,updated_at=now() WHERE id=true RETURNING * INTO result;
 INSERT INTO public.b2b_service_control_events(actor_id,revision,reason,before_state,after_state) VALUES(p_actor,result.revision,trim(p_reason),to_jsonb(old_row),to_jsonb(result));
 RETURN result;
END $$;
DO $$
DECLARE f text;
BEGIN
 FOREACH f IN ARRAY ARRAY['b2b_is_super_admin(uuid)','b2b_protect_super_admin()','b2b_staff_directory(uuid)','b2b_staff_snapshot(uuid)','b2b_manage_staff(uuid,text,uuid,text,integer,text,text,text,text)'] LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION public.'||f||' FROM PUBLIC,anon,authenticated';
 EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||f||' TO service_role';
 END LOOP;
END $$;
COMMIT;
