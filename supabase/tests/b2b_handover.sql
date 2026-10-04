-- All staff/proof examples are transaction fixtures and must be rolled back.
DO $$
DECLARE chief uuid;person uuid:=gen_random_uuid();h text;r public.b2b_handover_reviews;s jsonb;before_controls jsonb;before_policy jsonb;order_id uuid:=gen_random_uuid();item_id uuid:=gen_random_uuid();shipment_id uuid:=gen_random_uuid();
BEGIN
 SELECT user_id INTO chief FROM public.b2b_super_admin WHERE id;
 IF has_function_privilege('anon','public.b2b_handover_snapshot(uuid)','EXECUTE') OR has_table_privilege('authenticated','public.b2b_handover_reviews','SELECT') OR has_table_privilege('service_role','public.b2b_handover_events','UPDATE') THEN RAISE EXCEPTION 'handover exposed';END IF;
 SELECT to_jsonb(c) INTO before_controls FROM public.b2b_service_controls c WHERE id;
 SELECT to_jsonb(c) INTO before_policy FROM public.b2b_release_policy c WHERE id;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) VALUES(person,person||'@example.invalid','authenticated','authenticated',now(),now(),now());
 PERFORM public.b2b_manage_staff(chief,'register',NULL,person||'@example.invalid',NULL,'QA handover','product_staff','active','QA handover registration');
 s:=public.b2b_handover_snapshot(person);
 IF s->>'role'<>'product_staff' OR jsonb_array_length(s->'staff')<>1 OR s->'basis'?'operations' THEN RAISE EXCEPTION 'wrong role snapshot';END IF;
 h:=s->'basis'->>'access';
 r:=public.b2b_save_handover(person,'access',0,h,'passed','QA actual personal role access checks',NULL,false);
 IF r.staff_id<>person OR r.revision<>1 THEN RAISE EXCEPTION 'wrong review actor/version';END IF;
 BEGIN PERFORM public.b2b_save_handover(person,'access',0,h,'passed','QA duplicate old revision',NULL,false);RAISE EXCEPTION 'stale accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM public.b2b_save_handover(person,'operations',0,h,'passed','QA denied operation scope',NULL,false);RAISE EXCEPTION 'role escalation';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 h:=s->'basis'->>'auth_mail';
 BEGIN PERFORM public.b2b_save_handover(person,'auth_mail',0,h,'passed','QA no actual inbox confirmation',NULL,false);RAISE EXCEPTION 'SMTP treated as receipt';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM public.b2b_save_handover(person,'auth_mail',0,h,'passed','QA manually confirmed personal inbox and link',NULL,true);
 h:=s->'basis'->>'catalogue';
 PERFORM public.b2b_save_handover(person,'catalogue',0,h,'blocked','QA products are not verified yet',NULL,false);
 UPDATE public.b2b_business_settings SET revision=revision+1 WHERE id;
 s:=public.b2b_handover_snapshot(person);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'reviews') v WHERE v->>'check_id'='catalogue' AND (v->>'current')::boolean) THEN RAISE EXCEPTION 'changed source still current';END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'reviews') v WHERE v->>'check_id'='access' AND (v->>'current')::boolean) THEN RAISE EXCEPTION 'business change incorrectly invalidates personal login';END IF;
 BEGIN PERFORM public.b2b_save_handover(person,'catalogue',1,h,'blocked','QA old configuration rejected',NULL,false);RAISE EXCEPTION 'stale basis accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 s:=public.b2b_handover_snapshot(chief);h:=s->'basis'->>'domestic';
 BEGIN PERFORM public.b2b_save_handover(chief,'domestic',0,h,'passed','QA nonexistent completed order',gen_random_uuid(),false);RAISE EXCEPTION 'fake transaction accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 h:=s->'basis'->>'export';
 BEGIN PERFORM public.b2b_save_handover(chief,'export',0,h,'passed','QA nonexistent accepted proforma',gen_random_uuid(),false);RAISE EXCEPTION 'fake PI accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 h:=s->'basis'->>'document_mail';
 BEGIN PERFORM public.b2b_save_handover(chief,'document_mail',0,h,'passed','QA nonexistent accepted delivery',gen_random_uuid(),true);RAISE EXCEPTION 'fake email accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN UPDATE public.b2b_handover_events SET notes='QA mutated';RAISE EXCEPTION 'mutable audit';EXCEPTION WHEN insufficient_privilege OR raise_exception THEN IF SQLERRM='mutable audit' THEN RAISE;END IF;END;
 -- Proof integration uses a completed-order fixture; lifecycle actions are tested in b2b_orders.sql.
 INSERT INTO public.customer_accounts(id,email,name) VALUES(person,person||'@example.invalid','QA handover customer');
 INSERT INTO public.b2b_orders(id,number,submitted_by,request_key,request_hash,status,customer,delivery,evidence_request,net_minor,tax_minor,goods_total_minor,shipping_net_minor,shipping_tax_minor,total_minor,paid_minor,accepted_at)
 VALUES(order_id,'QA-HO-'||order_id,person,gen_random_uuid(),repeat('a',64),'completed','{}','{}','{}',100,10,110,0,0,110,110,now());
 INSERT INTO public.b2b_order_payments(order_id,kind,amount_minor,reference,evidence,occurred_at,actor_id) VALUES(order_id,'deposit',110,'QA-'||order_id,'QA rollback bank evidence',now(),chief);
 INSERT INTO public.b2b_order_items(id,order_id,position,snapshot,shipped_quantity) VALUES(item_id,order_id,1,jsonb_build_object('quantity',1,'product_id',(SELECT id FROM public.products ORDER BY id LIMIT 1)),1);
 INSERT INTO public.b2b_order_shipments(id,order_id,carrier,tracking,temperature,note,actor_id) VALUES(shipment_id,order_id,'direct','QA-'||order_id,'ambient','QA rollback shipment',chief);
 INSERT INTO public.b2b_order_shipment_items(shipment_id,order_id,item_id,quantity) VALUES(shipment_id,order_id,item_id,1);
 s:=public.b2b_handover_snapshot(chief);h:=s->'basis'->>'domestic';
 r:=public.b2b_save_handover(chief,'domestic',coalesce((SELECT revision FROM public.b2b_handover_reviews WHERE check_id='domestic' AND staff_id=chief),0),h,'passed','QA completed order payment shipment integration',order_id,false);
 IF r.reference_id<>order_id OR NOT public.b2b_handover_proof('domestic',order_id) THEN RAISE EXCEPTION 'valid completed reference rejected';END IF;
 IF public.b2b_handover_proof('export',order_id) OR public.b2b_handover_proof('document_mail',order_id) THEN RAISE EXCEPTION 'cross-type proof accepted';END IF;
 PERFORM public.b2b_manage_staff(chief,'update',person,NULL,1,'QA handover','inquiry_staff','active','QA changed role');
 s:=public.b2b_handover_snapshot(person);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'reviews') v WHERE (v->>'current')::boolean) THEN RAISE EXCEPTION 'role change still current';END IF;
 PERFORM public.b2b_manage_staff(chief,'remove',person,NULL,2,NULL,NULL,NULL,'QA removed handover staff');
 BEGIN PERFORM public.b2b_handover_snapshot(person);RAISE EXCEPTION 'removed access';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF (SELECT to_jsonb(c) FROM public.b2b_service_controls c WHERE id) IS DISTINCT FROM before_controls OR (SELECT to_jsonb(c) FROM public.b2b_release_policy c WHERE id) IS DISTINCT FROM before_policy THEN RAISE EXCEPTION 'review changed live trade policy';END IF;
END $$;
