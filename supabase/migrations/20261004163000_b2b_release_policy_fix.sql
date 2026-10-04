BEGIN;
CREATE OR REPLACE FUNCTION public.b2b_set_release_policy(p_actor uuid,p_revision integer,p_enabled boolean,p_reason text)
RETURNS public.b2b_release_policy LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.b2b_release_policy;r public.b2b_release_policy;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO old_row FROM public.b2b_release_policy WHERE id=true FOR UPDATE;
 IF p_revision IS DISTINCT FROM old_row.revision THEN RAISE EXCEPTION 'stale policy' USING ERRCODE='40001';END IF;
 IF p_enabled IS NULL OR length(trim(p_reason)) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'reason required' USING ERRCODE='22023';END IF;
 IF p_enabled AND NOT EXISTS(SELECT 1 FROM public.b2b_product_releases rel WHERE (rel.domestic OR rel.export) AND rel.fingerprint=public.b2b_release_facts(rel.product_id)->>'fingerprint')
 THEN RAISE EXCEPTION 'no reviewed product' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_release_policy SET enabled=p_enabled,revision=revision+1,updated_at=now() WHERE id=true RETURNING * INTO r;
 INSERT INTO public.b2b_release_events(actor_id,event,reason,before_state,after_state) VALUES(p_actor,'policy',trim(p_reason),to_jsonb(old_row),to_jsonb(r));
 RETURN r;
END $$;

INSERT INTO public.b2b_schema_versions(id) VALUES('20261004163000_b2b_release_policy_fix') ON CONFLICT DO NOTHING;
COMMIT;
