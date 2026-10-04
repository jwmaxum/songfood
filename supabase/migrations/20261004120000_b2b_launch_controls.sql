-- Additive operations controls. Defaults preserve existing service behavior.
CREATE TABLE IF NOT EXISTS public.b2b_service_controls(
 id boolean PRIMARY KEY DEFAULT true CHECK(id), revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 inquiries_paused boolean NOT NULL DEFAULT false,orders_paused boolean NOT NULL DEFAULT false,pi_paused boolean NOT NULL DEFAULT false,
 owner text NOT NULL DEFAULT '' CHECK(length(owner)<=200),response_minutes integer CHECK(response_minutes BETWEEN 5 AND 1440),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.b2b_service_controls(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.b2b_service_control_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES auth.users(id),
 revision integer NOT NULL,reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 500),
 before_state jsonb NOT NULL,after_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_service_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_service_control_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.b2b_service_controls,public.b2b_service_control_events FROM anon,authenticated;
GRANT SELECT ON public.b2b_service_controls,public.b2b_service_control_events TO service_role;
CREATE OR REPLACE FUNCTION public.b2b_save_service_controls(p_actor uuid,p_revision integer,p_state jsonb,p_reason text)
RETURNS public.b2b_service_controls LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.b2b_service_controls;result public.b2b_service_controls;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO old_row FROM public.b2b_service_controls WHERE id=true FOR UPDATE;
 IF p_revision IS DISTINCT FROM old_row.revision THEN RAISE EXCEPTION 'revision conflict' USING ERRCODE='40001';END IF;
 IF p_state IS NULL OR jsonb_typeof(p_state)<>'object' OR
 (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_state) k) IS DISTINCT FROM ARRAY['inquiries_paused','orders_paused','owner','pi_paused','response_minutes']::text[]
 OR jsonb_typeof(p_state->'inquiries_paused') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_state->'orders_paused') IS DISTINCT FROM 'boolean'
 OR jsonb_typeof(p_state->'pi_paused') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_state->'owner') IS DISTINCT FROM 'string'
 OR length(p_state->>'owner')>200 OR (p_state->>'owner') ~ '[<>]'
 OR (p_state->'response_minutes'<>'null'::jsonb AND (jsonb_typeof(p_state->'response_minutes')<>'number' OR (p_state->>'response_minutes') !~ '^[0-9]+$'
 OR (p_state->>'response_minutes')::numeric NOT BETWEEN 5 AND 1440))
 OR coalesce(length(trim(p_reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'invalid controls' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_service_controls SET revision=revision+1,inquiries_paused=(p_state->>'inquiries_paused')::boolean,
 orders_paused=(p_state->>'orders_paused')::boolean,pi_paused=(p_state->>'pi_paused')::boolean,
 owner=trim(p_state->>'owner'),response_minutes=(p_state->>'response_minutes')::integer,updated_at=now() WHERE id=true RETURNING * INTO result;
 INSERT INTO public.b2b_service_control_events(actor_id,revision,reason,before_state,after_state) VALUES(p_actor,result.revision,trim(p_reason),to_jsonb(old_row),to_jsonb(result));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.b2b_save_service_controls(uuid,integer,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_save_service_controls(uuid,integer,jsonb,text) TO service_role;
-- The shared row lock serializes a pause with a new DB transaction; no app-cache bypass.
CREATE OR REPLACE FUNCTION public.b2b_guard_new_trade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.b2b_service_controls;paused boolean;
BEGIN
 SELECT * INTO c FROM public.b2b_service_controls WHERE id=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service controls unavailable' USING ERRCODE='55000';END IF;
 paused:=CASE TG_TABLE_NAME WHEN 'commercial_inquiries' THEN c.inquiries_paused WHEN 'b2b_orders' THEN c.orders_paused WHEN 'b2b_pi_documents' THEN c.pi_paused ELSE true END;
 IF paused THEN RAISE EXCEPTION 'new trade paused' USING ERRCODE='55000';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.b2b_guard_new_trade() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS b2b_new_trade_guard ON public.commercial_inquiries;
CREATE TRIGGER b2b_new_trade_guard BEFORE INSERT ON public.commercial_inquiries FOR EACH ROW EXECUTE FUNCTION public.b2b_guard_new_trade();
DROP TRIGGER IF EXISTS b2b_new_trade_guard ON public.b2b_orders;
CREATE TRIGGER b2b_new_trade_guard BEFORE INSERT ON public.b2b_orders FOR EACH ROW EXECUTE FUNCTION public.b2b_guard_new_trade();
DROP TRIGGER IF EXISTS b2b_new_trade_guard ON public.b2b_pi_documents;
CREATE TRIGGER b2b_new_trade_guard BEFORE INSERT ON public.b2b_pi_documents FOR EACH ROW EXECUTE FUNCTION public.b2b_guard_new_trade();
CREATE OR REPLACE FUNCTION public.b2b_launch_snapshot(p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object(
 'products',(SELECT count(*) FROM public.products),
 'priced_products',(SELECT count(DISTINCT product_id) FROM (
 SELECT DISTINCT ON (r.product_id,r.price_list_id) r.* FROM public.b2b_price_revisions r JOIN public.b2b_price_lists l ON l.id=r.price_list_id
 WHERE l.active AND l.scope IN('common','personal') AND r.status='approved' AND r.valid_from<=now() ORDER BY r.product_id,r.price_list_id,r.version DESC) r WHERE r.valid_until>now()),
 'exchange_ready',coalesce((SELECT valid_until>now() FROM public.b2b_exchange_rates ORDER BY created_at DESC LIMIT 1),false),
 'bank_ready',EXISTS(SELECT 1 FROM public.b2b_order_settings WHERE id=true),
 'issuer_ready',EXISTS(SELECT 1 FROM public.b2b_pi_settings WHERE id=true),
 'private_pi_storage',EXISTS(SELECT 1 FROM storage.buckets WHERE id='b2b-proforma' AND NOT public),
 'notification_transport','test_inbox',
 'failed_notifications',(SELECT count(*) FROM public.b2b_notification_outbox WHERE status='failed'),
 'preparing_pi',(SELECT count(*) FROM public.b2b_pi_documents WHERE status='preparing'),
 'checked_at',now());
END $$;
REVOKE ALL ON FUNCTION public.b2b_launch_snapshot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_launch_snapshot(uuid) TO service_role;
