BEGIN;
CREATE OR REPLACE FUNCTION public.b2b_guard_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 IF is_export THEN
 IF NOT EXISTS(SELECT 1 FROM public.b2b_quote_drafts q CROSS JOIN LATERAL jsonb_array_elements(q.snapshot->'lines') source
 JOIN public.b2b_price_revisions pr ON pr.id=(source->'price_source'->>'id')::uuid JOIN public.b2b_price_lists pl ON pl.id=pr.price_list_id
 WHERE q.id=NEW.quote_id AND source->>'product_id'=item->>'product_id' AND pr.product_id=item->>'product_id'
 AND pl.active AND pr.status='approved' AND pr.valid_until>now() AND pr.id=(SELECT newer.id FROM public.b2b_price_revisions newer WHERE newer.product_id=pr.product_id AND newer.price_list_id=pr.price_list_id AND newer.status='approved' AND newer.valid_from<=now() ORDER BY newer.version DESC LIMIT 1))
 THEN RAISE EXCEPTION 'quote needs current price review' USING ERRCODE='40001';END IF;
 END IF;

 END LOOP;
 RETURN NEW;
END $$;

CREATE FUNCTION public.b2b_release_availability() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE enabled boolean;products jsonb;
BEGIN
 SELECT p.enabled INTO enabled FROM public.b2b_release_policy p WHERE id=true;
 IF enabled IS NULL THEN RAISE EXCEPTION 'release unavailable' USING ERRCODE='55000';END IF;
 IF NOT enabled THEN RETURN jsonb_build_object('enabled',false,'products','{}'::jsonb);END IF;
 SELECT coalesce(jsonb_object_agg(rel.product_id,jsonb_build_object(
 'domestic',rel.domestic AND rel.fingerprint=facts->>'fingerprint' AND jsonb_array_length(facts->'domestic_issues')=0,
 'export',rel.export AND rel.fingerprint=facts->>'fingerprint' AND jsonb_array_length(facts->'export_issues')=0)),'{}'::jsonb)
 INTO products FROM public.b2b_product_releases rel CROSS JOIN LATERAL public.b2b_release_facts(rel.product_id) facts;
 RETURN jsonb_build_object('enabled',true,'products',products);
END $$;
REVOKE ALL ON FUNCTION public.b2b_release_availability() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_release_availability() TO service_role;

INSERT INTO public.b2b_schema_versions(id) VALUES('20261004170000_b2b_release_availability') ON CONFLICT DO NOTHING;
COMMIT;
