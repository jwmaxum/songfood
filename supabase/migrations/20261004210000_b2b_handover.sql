-- Operational attestations never change trade policy, prices, accounts or delivery.
BEGIN;
CREATE TABLE public.b2b_handover_reviews(
 check_id text NOT NULL CHECK(check_id IN('access','auth_mail','catalogue','domestic','export','document_mail','operations','business')),
 staff_id uuid NOT NULL REFERENCES public.user_profiles(id),revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 result text NOT NULL CHECK(result IN('passed','blocked')),notes text NOT NULL,reference_id uuid,received boolean NOT NULL DEFAULT false,
 basis text NOT NULL,reviewed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(check_id,staff_id)
);
CREATE TABLE public.b2b_handover_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),staff_id uuid NOT NULL REFERENCES public.user_profiles(id),check_id text NOT NULL,
 result text NOT NULL,notes text NOT NULL,before_state jsonb,after_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_handover_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_handover_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_handover_reviews,public.b2b_handover_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.b2b_handover_reviews TO service_role;
GRANT SELECT,INSERT ON public.b2b_handover_events TO service_role;
CREATE TRIGGER b2b_handover_events_immutable BEFORE UPDATE OR DELETE ON public.b2b_handover_events FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();
CREATE FUNCTION public.b2b_handover_allowed(p_check text,p_role text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN p_check IN('access','auth_mail') THEN p_role IN('admin','product_staff','inquiry_staff','order_staff')
 WHEN p_check='catalogue' THEN p_role IN('admin','product_staff')
 WHEN p_check='domestic' THEN p_role IN('admin','order_staff')
 WHEN p_check IN('export','document_mail') THEN p_role IN('admin','inquiry_staff')
 WHEN p_check IN('operations','business') THEN p_role='admin' ELSE false END
$$;
CREATE FUNCTION public.b2b_handover_context() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object(
 'business',(SELECT to_jsonb(t) FROM public.b2b_business_settings t WHERE id),
 'bank',(SELECT to_jsonb(t) FROM public.b2b_order_settings t WHERE id),
 'issuer',(SELECT to_jsonb(t) FROM public.b2b_pi_settings t WHERE id),
 'controls',(SELECT to_jsonb(t) FROM public.b2b_service_controls t WHERE id),
 'owner_identity',(SELECT jsonb_build_object('role',p.role,'status',p.status,'revision',p.staff_revision,'removed',p.staff_removed_at,'verified',a.email_confirmed_at IS NOT NULL,'banned',a.banned_until>now()) FROM public.b2b_service_controls c JOIN public.user_profiles p ON p.id=c.owner_id JOIN auth.users a ON a.id=p.id WHERE c.id),
 'release_policy',(SELECT to_jsonb(t) FROM public.b2b_release_policy t WHERE id),
 'products',(SELECT coalesce(jsonb_agg(public.b2b_release_facts(p.id)||jsonb_build_object('review',to_jsonb(r)) ORDER BY p.id),'[]'::jsonb) FROM public.products p LEFT JOIN public.b2b_product_releases r ON r.product_id=p.id),
 'fx',(SELECT to_jsonb(t)||jsonb_build_object('valid',valid_until>now()) FROM public.b2b_exchange_rates t ORDER BY created_at DESC LIMIT 1),
 'mail',(SELECT jsonb_build_object('origin',origin,'code',last_code,'verified',verified_at>now()-interval '7 days') FROM public.b2b_mail_transport WHERE id),
 'storage',(SELECT jsonb_build_object('id',id,'public',public) FROM storage.buckets WHERE id='b2b-proforma')
 )::text,'UTF8')),'hex')
$$;
CREATE FUNCTION public.b2b_handover_hash(p_staff uuid,p_check text,p_context text) RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('staff',p.id,'revision',p.staff_revision,'role',p.role,'email',lower(a.email),'verified',a.email_confirmed_at,
 'context',CASE WHEN p_check IN('access','auth_mail') THEN 'identity' ELSE p_context END)::text,'UTF8')),'hex')
 FROM public.user_profiles p JOIN auth.users a ON a.id=p.id WHERE p.id=p_staff AND p.status='active' AND p.staff_removed_at IS NULL
 AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now()) AND public.b2b_handover_allowed(p_check,p.role)
$$;
CREATE FUNCTION public.b2b_handover_proof(p_check text,p_reference uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN p_check='domestic' THEN EXISTS(SELECT 1 FROM public.b2b_orders o WHERE o.id=p_reference AND status='completed' AND accepted_at IS NOT NULL AND claim_status<>'open'
 AND total_minor IS NOT NULL AND paid_minor-refunded_minor>=total_minor-credit_minor
 AND EXISTS(SELECT 1 FROM public.b2b_order_payments WHERE order_id=o.id AND kind='deposit')
 AND EXISTS(SELECT 1 FROM public.b2b_order_shipments WHERE order_id=o.id)
 AND EXISTS(SELECT 1 FROM public.b2b_order_items i JOIN public.b2b_order_shipment_items si ON si.order_id=i.order_id AND si.item_id=i.id WHERE i.order_id=o.id AND i.shipped_quantity>0 AND si.quantity>0))
 WHEN p_check='export' THEN EXISTS(SELECT 1 FROM public.b2b_pi_documents WHERE id=p_reference AND status='issued' AND accepted_at IS NOT NULL AND change_requested_at IS NULL AND pdf_path IS NOT NULL)
 WHEN p_check='document_mail' THEN EXISTS(SELECT 1 FROM public.b2b_email_deliveries WHERE notification_id=p_reference AND state='accepted')
 ELSE p_reference IS NULL END
$$;
CREATE FUNCTION public.b2b_handover_snapshot(p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_role text;context text;keys text[]:=ARRAY['access','auth_mail','catalogue','domestic','export','document_mail','operations','business'];v_basis jsonb;
BEGIN
 SELECT p.role INTO v_role FROM public.user_profiles p JOIN auth.users a ON a.id=p.id WHERE p.id=p_actor AND p.status='active' AND p.staff_removed_at IS NULL
 AND p.role IN('admin','product_staff','inquiry_staff','order_staff') AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now());
 IF v_role IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 context:=public.b2b_handover_context();
 SELECT jsonb_object_agg(k,public.b2b_handover_hash(p_actor,k,context)) INTO v_basis FROM unnest(keys) k WHERE public.b2b_handover_allowed(k,v_role);
 RETURN jsonb_build_object('actor_id',p_actor,'role',v_role,'basis',v_basis,
 'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'role',p.role) ORDER BY p.id) FROM public.user_profiles p JOIN auth.users a ON a.id=p.id
 WHERE p.status='active' AND p.staff_removed_at IS NULL AND p.role IN('admin','product_staff','inquiry_staff','order_staff')
 AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now()) AND (v_role='admin' OR p.id=p_actor)),'[]'::jsonb),
 'reviews',coalesce((SELECT jsonb_agg(to_jsonb(r)||jsonb_build_object('current',r.basis=public.b2b_handover_hash(r.staff_id,r.check_id,context)
 AND (r.result='blocked' OR public.b2b_handover_proof(r.check_id,r.reference_id))) ORDER BY r.reviewed_at DESC)
 FROM public.b2b_handover_reviews r WHERE r.revision>0 AND (v_role='admin' OR r.staff_id=p_actor)
 AND public.b2b_handover_hash(r.staff_id,r.check_id,context) IS NOT NULL),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM (SELECT id,staff_id,check_id,result,notes,created_at FROM public.b2b_handover_events
 WHERE v_role='admin' OR staff_id=p_actor ORDER BY created_at DESC,id DESC LIMIT 30)e),'[]'::jsonb));
END $$;
CREATE FUNCTION public.b2b_save_handover(p_actor uuid,p_check text,p_revision integer,p_hash text,p_result text,p_notes text,p_reference uuid,p_received boolean)
RETURNS public.b2b_handover_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_role text;context text;current_hash text;old_row public.b2b_handover_reviews;r public.b2b_handover_reviews;
BEGIN
 -- No Auth table lock. A later identity/configuration change invalidates the attestation on read.
 SELECT p.role INTO v_role FROM public.user_profiles p JOIN auth.users a ON a.id=p.id WHERE p.id=p_actor AND p.status='active' AND p.staff_removed_at IS NULL
 AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now());
 IF v_role IS NULL OR NOT public.b2b_handover_allowed(p_check,v_role) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_revision IS NULL OR p_revision<0 OR p_hash IS NULL OR p_hash!~'^[0-9a-f]{64}$' OR p_result IS NULL OR p_result NOT IN('passed','blocked')
 OR p_notes IS NULL OR length(trim(p_notes)) NOT BETWEEN 10 AND 1500 OR p_notes~'[<>[:cntrl:]]' OR p_received IS NULL
 OR (p_reference IS NOT NULL AND p_check NOT IN('domestic','export','document_mail'))
 THEN RAISE EXCEPTION 'invalid attestation' USING ERRCODE='22023';END IF;
 context:=public.b2b_handover_context();current_hash:=public.b2b_handover_hash(p_actor,p_check,context);
 IF current_hash IS NULL OR current_hash IS DISTINCT FROM p_hash THEN RAISE EXCEPTION 'changed basis' USING ERRCODE='40001';END IF;
 IF p_result='passed' THEN
  IF NOT public.b2b_handover_proof(p_check,p_reference) OR (p_check IN('auth_mail','document_mail') AND NOT p_received) THEN RAISE EXCEPTION 'missing actual proof' USING ERRCODE='22023';END IF;
  IF p_check='catalogue' AND NOT EXISTS(SELECT 1 FROM public.b2b_product_releases rel CROSS JOIN LATERAL (SELECT public.b2b_release_facts(rel.product_id) f) d
   WHERE rel.fingerprint=f->>'fingerprint' AND ((rel.domestic AND jsonb_array_length(f->'domestic_issues')=0) OR (rel.export AND jsonb_array_length(f->'export_issues')=0))) THEN RAISE EXCEPTION 'no current release' USING ERRCODE='22023';END IF;
  IF p_check='business' AND EXISTS(SELECT 1 FROM unnest(ARRAY['name','owner','registration','ecommerce_registration','address','address_en','phone','email','export_phone','privacy_contact','shipping_ko','shipping_en','returns_ko','returns_en','privacy_ko','privacy_en']) k
   WHERE NOT EXISTS(SELECT 1 FROM public.b2b_business_settings WHERE id AND coalesce(length(trim(profile->>k)),0)>0)) THEN RAISE EXCEPTION 'business incomplete' USING ERRCODE='22023';END IF;
  IF p_check='operations' AND NOT EXISTS(SELECT 1 FROM public.b2b_service_controls c JOIN public.user_profiles p ON p.id=c.owner_id JOIN auth.users a ON a.id=p.id
   WHERE c.id AND c.response_minutes IS NOT NULL AND p.status='active' AND p.staff_removed_at IS NULL AND p.role IN('admin','product_staff','inquiry_staff','order_staff')
   AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now())) THEN RAISE EXCEPTION 'owner incomplete' USING ERRCODE='22023';END IF;
 END IF;
 INSERT INTO public.b2b_handover_reviews(check_id,staff_id,result,notes,basis) VALUES(p_check,p_actor,'blocked','pending','') ON CONFLICT DO NOTHING;
 SELECT * INTO old_row FROM public.b2b_handover_reviews WHERE check_id=p_check AND staff_id=p_actor FOR UPDATE;
 IF old_row.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'stale review' USING ERRCODE='40001';END IF;
 UPDATE public.b2b_handover_reviews SET revision=revision+1,result=p_result,notes=trim(p_notes),reference_id=p_reference,received=p_received,basis=current_hash,reviewed_at=now()
 WHERE check_id=p_check AND staff_id=p_actor RETURNING * INTO r;
 INSERT INTO public.b2b_handover_events(staff_id,check_id,result,notes,before_state,after_state) VALUES(p_actor,p_check,p_result,trim(p_notes),to_jsonb(old_row),to_jsonb(r));
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.b2b_handover_allowed(text,text),public.b2b_handover_context(),public.b2b_handover_hash(uuid,text,text),public.b2b_handover_proof(text,uuid),public.b2b_handover_snapshot(uuid),public.b2b_save_handover(uuid,text,integer,text,text,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_handover_snapshot(uuid),public.b2b_save_handover(uuid,text,integer,text,text,text,uuid,boolean) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261004210000_b2b_handover') ON CONFLICT DO NOTHING;
COMMIT;
