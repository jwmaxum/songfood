-- Keep staff revision serialization without blocking unrelated Supabase Auth signup writes.
BEGIN;
CREATE OR REPLACE FUNCTION public.b2b_manage_staff(p_actor uuid,p_action text,p_id uuid,p_email text,p_revision integer,p_name text,p_role text,p_status text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;v_email text;v_count integer;old_row public.user_profiles;r public.user_profiles;c public.b2b_service_controls;after_c public.b2b_service_controls;
BEGIN
 -- Same order as other business writers: identity tables before service controls.
 LOCK TABLE public.user_profiles IN SHARE ROW EXCLUSIVE MODE;
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
COMMIT;
