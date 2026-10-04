-- Limited release is an explicit administrator decision; catalogue/inquiries stay available.
BEGIN;
CREATE TABLE public.b2b_release_policy(id boolean PRIMARY KEY DEFAULT true CHECK(id),enabled boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.b2b_release_policy(id) VALUES(true);
CREATE TABLE public.b2b_product_releases(
 product_id text PRIMARY KEY REFERENCES public.products(id),revision integer NOT NULL DEFAULT 1,
 domestic boolean NOT NULL DEFAULT false,export boolean NOT NULL DEFAULT false,fingerprint text NOT NULL,
 reason text NOT NULL,reviewed_by uuid NOT NULL REFERENCES public.user_profiles(id),reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.b2b_release_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES public.user_profiles(id),
 product_id text,event text NOT NULL,reason text NOT NULL,before_state jsonb,after_state jsonb,created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_release_policy','b2b_product_releases','b2b_release_events'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE TRIGGER b2b_release_events_immutable BEFORE UPDATE OR DELETE ON public.b2b_release_events FOR EACH ROW EXECUTE FUNCTION public.b2b_crm_immutable();
CREATE FUNCTION public.b2b_release_facts(p_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb;prices jsonb;issues text[]:='{}';export_issues text[]:='{}';k text;domestic_ready boolean;export_ready boolean;snapshot jsonb;
BEGIN
 SELECT to_jsonb(t)-ARRAY['price','price_krw','wholesale_price_krw','box_price','carton_price','original_price','stock','updated_at','created_at','rating','reviews_count'] INTO p FROM public.products t WHERE id=p_id;
 IF p IS NULL THEN RAISE EXCEPTION 'missing product' USING ERRCODE='P0002';END IF;
 FOREACH k IN ARRAY ARRAY['name','sku','country_of_origin','storage','shelf_life','ingredients','allergens','net_weight'] LOOP
 IF coalesce(length(trim(p->>k)),0)=0 THEN issues:=array_append(issues,k||' 미입력');END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.price_list_id),'[]'::jsonb) INTO prices FROM (
 SELECT DISTINCT ON (r.price_list_id) r.*,l.scope FROM public.b2b_price_revisions r JOIN public.b2b_price_lists l ON l.id=r.price_list_id
 WHERE r.product_id=p_id AND l.active AND r.status='approved' AND r.valid_from<=now() ORDER BY r.price_list_id,r.version DESC)r;
 domestic_ready:=EXISTS(SELECT 1 FROM jsonb_array_elements(prices) r WHERE r->>'scope' IN('common','personal') AND (r->>'valid_until')::timestamptz>now());
 export_ready:=EXISTS(SELECT 1 FROM jsonb_array_elements(prices) r WHERE r->>'scope' IN('common','business','company') AND (r->>'valid_until')::timestamptz>now()
 AND r->>'fob_status'='included' AND (r->>'export_moq_ctn')::integer>0 AND coalesce((r->>'ea_per_carton')::integer,(r->>'ea_per_box')::integer*(r->>'boxes_per_carton')::integer)>0);
 IF NOT domestic_ready THEN issues:=array_append(issues,'유효한 공통·개인 승인 가격 없음');END IF;
 export_issues:=ARRAY[]::text[];
 FOREACH k IN ARRAY ARRAY['name','name_en','sku','country_of_origin','storage','shelf_life','ingredients','allergens','net_weight'] LOOP
 IF coalesce(length(trim(p->>k)),0)=0 THEN export_issues:=array_append(export_issues,k||' 미입력');END IF;
 END LOOP;
 IF NOT export_ready THEN export_issues:=array_append(export_issues,'유효한 FOB 포함 가격·카톤 환산·수출 MOQ 없음');END IF;
 snapshot:=jsonb_build_object('product',p,'prices',prices);
 RETURN jsonb_build_object('product_id',p_id,'name',p->>'name','sku',p->>'sku',
 'fingerprint',encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),'domestic_issues',issues,'export_issues',export_issues);
END $$;
CREATE FUNCTION public.b2b_release_snapshot(p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role IN('admin','product_staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(public.b2b_release_facts(p.id)||jsonb_build_object('review',to_jsonb(r)) ORDER BY p.id),'[]') INTO rows
 FROM public.products p LEFT JOIN public.b2b_product_releases r ON r.product_id=p.id;
 RETURN jsonb_build_object('policy',(SELECT to_jsonb(t) FROM public.b2b_release_policy t WHERE id=true),'products',rows,
 'events',(SELECT coalesce(jsonb_agg(to_jsonb(e)),'[]') FROM (SELECT product_id,event,reason,created_at FROM public.b2b_release_events ORDER BY created_at DESC LIMIT 30)e));
END $$;
CREATE FUNCTION public.b2b_save_release(p_actor uuid,p_id text,p_revision integer,p_hash text,p_domestic boolean,p_export boolean,p_reason text)
RETURNS public.b2b_product_releases LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.b2b_product_releases;r public.b2b_product_releases;facts jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 PERFORM 1 FROM public.b2b_release_policy WHERE id=true FOR SHARE;
 PERFORM 1 FROM public.products WHERE id=p_id FOR SHARE;
 LOCK TABLE public.b2b_price_revisions,public.b2b_price_lists IN SHARE MODE;
 -- Create placeholder before locking so concurrent first reviews serialize.
 INSERT INTO public.b2b_product_releases(product_id,fingerprint,reason,reviewed_by,revision) VALUES(p_id,'','unreviewed',p_actor,0) ON CONFLICT DO NOTHING;
 SELECT * INTO old_row FROM public.b2b_product_releases WHERE product_id=p_id FOR UPDATE;
 IF old_row.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'stale review' USING ERRCODE='40001';END IF;
 facts:=public.b2b_release_facts(p_id);
 IF p_hash IS DISTINCT FROM facts->>'fingerprint' THEN RAISE EXCEPTION 'product changed' USING ERRCODE='40001';END IF;
 IF p_domestic IS NULL OR p_export IS NULL OR length(trim(p_reason)) NOT BETWEEN 10 AND 1000
 OR (p_domestic AND jsonb_array_length(facts->'domestic_issues')>0) OR (p_export AND jsonb_array_length(facts->'export_issues')>0)
 THEN RAISE EXCEPTION 'review incomplete' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_product_releases SET revision=revision+1,domestic=p_domestic,export=p_export,fingerprint=p_hash,reason=trim(p_reason),reviewed_by=p_actor,reviewed_at=now() WHERE product_id=p_id RETURNING * INTO r;
 INSERT INTO public.b2b_release_events(actor_id,product_id,event,reason,before_state,after_state) VALUES(p_actor,p_id,'review',trim(p_reason),to_jsonb(old_row),to_jsonb(r));
 RETURN r;
END $$;
CREATE FUNCTION public.b2b_set_release_policy(p_actor uuid,p_revision integer,p_enabled boolean,p_reason text)
RETURNS public.b2b_release_policy LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.b2b_release_policy;r public.b2b_release_policy;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO old_row FROM public.b2b_release_policy WHERE id=true FOR UPDATE;
 IF p_revision IS DISTINCT FROM old_row.revision THEN RAISE EXCEPTION 'stale policy' USING ERRCODE='40001';END IF;
 IF p_enabled IS NULL OR length(trim(p_reason)) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'reason required' USING ERRCODE='22023';END IF;
 IF p_enabled AND NOT EXISTS(SELECT 1 FROM public.b2b_product_releases r WHERE (r.domestic OR r.export) AND r.fingerprint=public.b2b_release_facts(r.product_id)->>'fingerprint')
 THEN RAISE EXCEPTION 'no reviewed product' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_release_policy SET enabled=p_enabled,revision=revision+1,updated_at=now() WHERE id=true RETURNING * INTO r;
 INSERT INTO public.b2b_release_events(actor_id,event,reason,before_state,after_state) VALUES(p_actor,'policy',trim(p_reason),to_jsonb(old_row),to_jsonb(r));
 RETURN r;
END $$;
CREATE FUNCTION public.b2b_guard_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE enabled boolean;item jsonb;facts jsonb;r public.b2b_product_releases;is_export boolean;
BEGIN
 SELECT p.enabled INTO enabled FROM public.b2b_release_policy p WHERE id=true FOR SHARE;
 IF enabled IS NULL THEN RAISE EXCEPTION 'release policy unavailable' USING ERRCODE='55000';END IF;
 IF NOT enabled THEN RETURN NEW;END IF;
 is_export:=TG_TABLE_NAME='b2b_pi_documents';
 LOCK TABLE public.b2b_price_revisions,public.b2b_price_lists IN SHARE MODE;
 FOR item IN SELECT value FROM jsonb_array_elements(CASE WHEN is_export THEN NEW.snapshot->'lines' ELSE jsonb_build_array(NEW.snapshot) END) ORDER BY value->>'product_id' LOOP
 PERFORM 1 FROM public.products WHERE id=item->>'product_id' FOR SHARE;
 SELECT * INTO r FROM public.b2b_product_releases WHERE product_id=item->>'product_id' FOR SHARE;
 facts:=public.b2b_release_facts(item->>'product_id');
 IF r.product_id IS NULL OR r.fingerprint IS DISTINCT FROM facts->>'fingerprint' OR (is_export AND (NOT r.export OR jsonb_array_length(facts->'export_issues')>0)) OR (NOT is_export AND (NOT r.domestic OR jsonb_array_length(facts->'domestic_issues')>0))
 THEN RAISE EXCEPTION 'product needs release review' USING ERRCODE='22023';END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER b2b_release_guard BEFORE INSERT ON public.b2b_order_items FOR EACH ROW EXECUTE FUNCTION public.b2b_guard_release();
CREATE TRIGGER b2b_release_guard BEFORE INSERT ON public.b2b_pi_documents FOR EACH ROW EXECUTE FUNCTION public.b2b_guard_release();
REVOKE ALL ON FUNCTION public.b2b_release_facts(text),public.b2b_release_snapshot(uuid),public.b2b_save_release(uuid,text,integer,text,boolean,boolean,text),public.b2b_set_release_policy(uuid,integer,boolean,text),public.b2b_guard_release() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_release_facts(text),public.b2b_release_snapshot(uuid),public.b2b_save_release(uuid,text,integer,text,boolean,boolean,text),public.b2b_set_release_policy(uuid,integer,boolean,text) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261004153000_b2b_product_release') ON CONFLICT DO NOTHING;
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
 'notification_transport','gmail_smtp_relay',
 'mail_verified',EXISTS(SELECT 1 FROM public.b2b_mail_transport WHERE id=true AND verified_at>now()-interval '7 days' AND last_code='SMTP_VERIFIED'),
 'release_enabled',(SELECT enabled FROM public.b2b_release_policy WHERE id=true),
 'released_products',(SELECT count(*) FROM public.b2b_product_releases r WHERE (r.domestic OR r.export) AND r.fingerprint=public.b2b_release_facts(r.product_id)->>'fingerprint'),
 'failed_notifications',(SELECT count(*) FROM public.b2b_email_deliveries WHERE state IN('failed','uncertain') OR (state='sending' AND lease_until<now())),
 'preparing_pi',(SELECT count(*) FROM public.b2b_pi_documents WHERE status='preparing'),
 'checked_at',now());
END $$;

COMMIT;
