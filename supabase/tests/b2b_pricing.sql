-- Run inside a transaction; all users, drafts, approvals and exchange rates are rolled back.
DO $$
DECLARE a uuid:=gen_random_uuid(); staff uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid();
 r public.b2b_price_revisions; next_r public.b2b_price_revisions; stale public.b2b_price_revisions;
 rate public.b2b_exchange_rates; payload jsonb; denied boolean; t text;
BEGIN
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at)
 VALUES(a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (staff,staff::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (customer,customer::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
 INSERT INTO public.user_profiles(id,email,name,role,status) VALUES
 (a,a::text||'@example.invalid','Pricing test admin','admin','active'),
 (staff,staff::text||'@example.invalid','Pricing test staff','product_staff','active');
 payload:=jsonb_build_object('product_id','prod-1','price_list_id','00000000-0000-4000-8000-000000000201',
  'price_unit','EA','unit_price_krw','110000','tax_code','vat10','vat_included',true,
  'ea_per_box',10,'boxes_per_carton',5,'ea_per_carton',50,'minimum_order_unit','BOX','minimum_order_quantity',2,
  'export_moq_ctn',1,'tiers','[]'::jsonb,'valid_from',now()-interval '1 hour','valid_until',now()+interval '1 day',
  'fob_status','included','loading_port','Busan','cost_review','Transaction test included cost',
  'review_source','Rollback test fixture only','change_reason','Initial test price');
 SELECT * INTO r FROM public.b2b_save_price_drafts(staff,jsonb_build_array(payload));
 denied:=false;
 BEGIN PERFORM public.b2b_approve_price(staff,r.id); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'product staff approved price'; END IF;
 PERFORM public.b2b_approve_price(a,r.id);
 denied:=false;
 BEGIN UPDATE public.b2b_price_revisions SET unit_price_krw=1 WHERE id=r.id; EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'approved history editable'; END IF;
 payload:=payload||jsonb_build_object('supersedes_id',r.id,'unit_price_krw','121000','change_reason','Cost change proposal');
 SELECT * INTO next_r FROM public.b2b_save_price_drafts(staff,jsonb_build_array(payload));
 SELECT * INTO stale FROM public.b2b_save_price_drafts(staff,jsonb_build_array(payload));
 PERFORM public.b2b_approve_price(a,next_r.id);
 denied:=false;
 BEGIN PERFORM public.b2b_approve_price(a,stale.id); EXCEPTION WHEN serialization_failure THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'stale proposal approved'; END IF;
 denied:=false;
 BEGIN PERFORM public.b2b_save_price_drafts(customer,jsonb_build_array(payload)); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'customer saved a price'; END IF;
 SELECT * INTO rate FROM public.b2b_add_exchange_rate(a,1250,'Transaction test only',now()-interval '1 minute',now()+interval '1 hour','Rollback test rate');
 denied:=false;
 BEGIN UPDATE public.b2b_exchange_rates SET krw_per_usd=1 WHERE id=rate.id; EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'rate history editable'; END IF;
 FOREACH t IN ARRAY ARRAY['b2b_price_lists','b2b_price_revisions','b2b_exchange_rates','b2b_pricing_audit'] LOOP
  IF has_table_privilege('anon','public.'||t,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated','public.'||t,'SELECT,INSERT,UPDATE,DELETE')
    THEN RAISE EXCEPTION 'direct price table access: %',t; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) THEN RAISE EXCEPTION 'RLS disabled: %',t; END IF;
 END LOOP;
 IF has_function_privilege('authenticated','public.b2b_approve_price(uuid,uuid)','EXECUTE') OR
   has_function_privilege('anon','public.b2b_save_price_drafts(uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'public pricing RPC'; END IF;
END $$;
