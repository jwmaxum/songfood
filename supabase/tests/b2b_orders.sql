-- Apply migration + this file in a single transaction, then ROLLBACK.
DO $$
DECLARE admin_id uuid:=gen_random_uuid();buyer uuid:=gen_random_uuid();other_buyer uuid:=gen_random_uuid();wrong_staff uuid:=gen_random_uuid();
 product text;price uuid;expired_price uuid;id1 uuid;id2 uuid;cid uuid;item_id uuid;k uuid:=gen_random_uuid();action_key uuid:=gen_random_uuid();hash text:=repeat('a',64);
 lines jsonb;delivery jsonb;review jsonb;d jsonb;v integer;n integer;t text;sig text;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_order_settings','b2b_orders','b2b_order_items','b2b_order_payments','b2b_order_shipments','b2b_order_shipment_items','b2b_order_events'] LOOP
  IF has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('authenticated','public.'||t,'SELECT')
   OR NOT(SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) THEN RAISE EXCEPTION 'private table leaked %',t;END IF;
 END LOOP;
 FOR sig IN SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname LIKE 'b2b_order_%' LOOP
  IF has_function_privilege('anon',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE') THEN RAISE EXCEPTION 'public RPC open';END IF;
 END LOOP;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) SELECT u,u||'@example.invalid','authenticated','authenticated',now(),now(),now() FROM unnest(ARRAY[admin_id,buyer,other_buyer,wrong_staff])u;
 INSERT INTO user_profiles(id,email,name,role,status) VALUES(admin_id,admin_id||'@example.invalid','Order test staff','admin','active'),(wrong_staff,wrong_staff||'@example.invalid','Other staff','inquiry_staff','active');
 INSERT INTO customer_accounts(id,email,name) VALUES(buyer,buyer||'@example.invalid','Order test buyer'),(other_buyer,other_buyer||'@example.invalid','Other buyer');
 SELECT id INTO product FROM products ORDER BY id LIMIT 1;
 INSERT INTO b2b_price_revisions(product_id,price_list_id,version,status,price_unit,unit_price_krw,tax_code,vat_included,minimum_order_unit,minimum_order_quantity,valid_from,valid_until,review_source,change_reason,created_by,approved_by,approved_at)
 VALUES(product,'00000000-0000-4000-8000-000000000201',999998,'approved','EA',1100,'vat10',true,'EA',1,now()-interval '1 day',now()+interval '1 day','rollback only','rollback only',admin_id,admin_id,now()) RETURNING id INTO price;
 lines:=jsonb_build_array(jsonb_build_object('product_id',product,'name','Rollback food','sku','TEST','storage','상온','quantity',10,'unit','EA','currency','KRW','tax_code','vat10','ea_per_unit',1,'price_version_id',price,'price_version',999998,'valid_until',now()+interval '1 day','unit_net_minor',1000,'unit_tax_minor',100,'unit_total_minor',1100,'net_minor',10000,'tax_minor',1000,'total_minor',11000));
 delivery:='{"recipient":"Rollback recipient","phone":"01000000000","postal_code":"12345","address":"Rollback only","address_detail":"","desired_date":"","temperature":"ambient","note":""}';
 review:=jsonb_build_object('shipping_net_minor',1000,'shipping_tax_minor',100,'shipping_tax_code','vat10','supply_confirmed',true,'ship_date',(now() AT TIME ZONE 'Asia/Seoul')::date,'temperature','ambient','note','All supply checked');
 id1:=b2b_order_submit(buyer,NULL,k,hash,delivery,'{"kind":"none"}',lines);
 IF b2b_order_submit(buyer,NULL,k,hash,delivery,'{"kind":"none"}',lines)<>id1 OR (SELECT count(*) FROM b2b_orders WHERE submitted_by=buyer)<>1 THEN RAISE EXCEPTION 'submit replay';END IF;
 BEGIN PERFORM b2b_order_submit(buyer,NULL,k,repeat('b',64),delivery,'{}',lines);RAISE EXCEPTION 'hash mismatch allowed';EXCEPTION WHEN unique_violation THEN NULL;END;
 BEGIN PERFORM b2b_order_detail(other_buyer,id1,false);RAISE EXCEPTION 'cross customer read';EXCEPTION WHEN no_data_found THEN NULL;END;
 BEGIN PERFORM b2b_order_detail(wrong_staff,id1,true);RAISE EXCEPTION 'wrong staff read';EXCEPTION WHEN no_data_found THEN NULL;END;
 -- Bank settings and supply confirmation are prerequisites.
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,1,gen_random_uuid(),hash,'review',review||'{"supply_confirmed":false}');RAISE EXCEPTION 'unconfirmed supply';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_settings_save(admin_id,coalesce((SELECT revision FROM b2b_order_settings WHERE id),0),'{"bank":"ROLLBACK","account":"TEST-ONLY","holder":"TEST","notice":""}');
 BEGIN PERFORM b2b_order_settings_save(wrong_staff,1,'{"bank":"X","account":"X","holder":"X"}');RAISE EXCEPTION 'wrong staff bank';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id1,true,1,action_key,hash,'review',review);
 PERFORM b2b_order_action(admin_id,id1,true,1,action_key,hash,'review',review);
 IF (SELECT revision FROM b2b_orders WHERE id=id1)<>2 THEN RAISE EXCEPTION 'action replay';END IF;
 BEGIN PERFORM b2b_order_action(buyer,id1,false,1,gen_random_uuid(),hash,'accept','{}');RAISE EXCEPTION 'stale accept';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM b2b_order_action(buyer,id1,false,2,gen_random_uuid(),hash,'deposit','{}');RAISE EXCEPTION 'customer paid';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM b2b_order_action(buyer,id1,false,2,gen_random_uuid(),hash,'accept','{}');
 BEGIN UPDATE b2b_orders SET total_minor=12101,shipping_net_minor=1001 WHERE id=id1;RAISE EXCEPTION 'changed accepted terms';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'accepted terms are immutable' THEN RAISE;END IF;END;
 SELECT id INTO item_id FROM b2b_order_items WHERE order_id=id1;
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,3,gen_random_uuid(),hash,'ship',jsonb_build_object('carrier','direct','tracking','TEST-1','temperature','ambient','note','Test delivery','items',jsonb_build_array(jsonb_build_object('item_id',item_id,'quantity',1))));RAISE EXCEPTION 'unpaid shipment';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_action(buyer,id1,false,3,gen_random_uuid(),hash,'deposit_report','{"message":"Buyer says paid"}');
 IF (SELECT paid_minor FROM b2b_orders WHERE id=id1)<>0 THEN RAISE EXCEPTION 'customer report paid';END IF;
 PERFORM b2b_order_action(admin_id,id1,true,4,gen_random_uuid(),hash,'deposit',jsonb_build_object('amount_minor',6000,'reference','rollback-deposit-1-'||id1,'evidence','PRIVATE BANK EVIDENCE','occurred_at',now()));
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,5,gen_random_uuid(),hash,'ship',jsonb_build_object('carrier','direct','tracking','TEST-1','temperature','ambient','note','Test delivery','items',jsonb_build_array(jsonb_build_object('item_id',item_id,'quantity',1))));RAISE EXCEPTION 'partial payment shipment';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,5,gen_random_uuid(),hash,'deposit',jsonb_build_object('amount_minor',6101,'reference','overpayment','evidence','TEST','occurred_at',now()));RAISE EXCEPTION 'overpayment';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id1,true,5,gen_random_uuid(),hash,'deposit',jsonb_build_object('amount_minor',6100,'reference','rollback-deposit-2-'||id1,'evidence','PRIVATE BANK EVIDENCE','occurred_at',now()));
 d:=b2b_order_detail(buyer,id1,false);
 IF d::text LIKE '%PRIVATE BANK EVIDENCE%' OR d->'payments'->0?'reference' OR d->'order'?'request_hash' THEN RAISE EXCEPTION 'internal evidence leaked';END IF;
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,6,gen_random_uuid(),hash,'ship',jsonb_build_object('carrier','direct','tracking','TEST-1','temperature','ambient','note','Test delivery','items',jsonb_build_array(jsonb_build_object('item_id',item_id,'quantity',11))));RAISE EXCEPTION 'overshipment';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id1,true,6,gen_random_uuid(),hash,'ship',jsonb_build_object('carrier','direct','tracking','TEST-1-'||id1,'temperature','ambient','note','Test delivery','items',jsonb_build_array(jsonb_build_object('item_id',item_id,'quantity',4))));
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,7,gen_random_uuid(),hash,'cancel','{"message":"Cannot erase shipments"}');RAISE EXCEPTION 'cancel shipped';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,7,gen_random_uuid(),hash,'ship',jsonb_build_object('carrier','direct','tracking','TEST-1-'||id1,'temperature','ambient','note','Duplicate truck','items',jsonb_build_array(jsonb_build_object('item_id',item_id,'quantity',1))));RAISE EXCEPTION 'duplicate shipment';EXCEPTION WHEN unique_violation THEN NULL;END;
 PERFORM b2b_order_action(buyer,id1,false,7,gen_random_uuid(),hash,'claim','{"message":"Cancel undelivered items"}');
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,8,gen_random_uuid(),hash,'ship',jsonb_build_object('carrier','direct','tracking','TEST-2','temperature','ambient','note','Test delivery','items',jsonb_build_array(jsonb_build_object('item_id',item_id,'quantity',1))));RAISE EXCEPTION 'claim shipment';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id1,true,8,gen_random_uuid(),hash,'cancel_remaining','{"message":"Cancel remaining six","agreement":"Buyer phone confirmation"}');
 IF (SELECT credit_minor FROM b2b_orders WHERE id=id1)<>6600 THEN RAISE EXCEPTION 'remaining credit';END IF;
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,9,gen_random_uuid(),hash,'refund',jsonb_build_object('amount_minor',6601,'reference','over-refund','evidence','TEST','occurred_at',now()));RAISE EXCEPTION 'overrefund';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id1,true,9,gen_random_uuid(),hash,'refund',jsonb_build_object('amount_minor',6000,'reference','rollback-refund-1-'||id1,'evidence','PRIVATE REFUND EVIDENCE','occurred_at',now()));
 BEGIN PERFORM b2b_order_action(admin_id,id1,true,10,gen_random_uuid(),hash,'resolve_claim','{"message":"Premature resolve"}');RAISE EXCEPTION 'unrefunded resolve';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id1,true,10,gen_random_uuid(),hash,'refund',jsonb_build_object('amount_minor',600,'reference','rollback-refund-2-'||id1,'evidence','PRIVATE REFUND EVIDENCE','occurred_at',now()));
 PERFORM b2b_order_action(admin_id,id1,true,11,gen_random_uuid(),hash,'resolve_claim','{"message":"Refund and cancellation agreed"}');
 IF (SELECT status FROM b2b_orders WHERE id=id1)<>'completed' OR (SELECT shipped_quantity FROM b2b_order_items WHERE order_id=id1)<>4 OR (SELECT cancelled_quantity FROM b2b_order_items WHERE order_id=id1)<>6 THEN RAISE EXCEPTION 'partial settlement consistency';END IF;
 -- Another order may not reuse the same bank transaction, even with a fresh request key.
 id2:=b2b_order_submit(buyer,NULL,gen_random_uuid(),hash,delivery,'{}',lines);
 PERFORM b2b_order_action(admin_id,id2,true,1,gen_random_uuid(),hash,'review',review);
 PERFORM b2b_order_action(buyer,id2,false,2,gen_random_uuid(),hash,'accept','{}');
 BEGIN PERFORM b2b_order_action(admin_id,id2,true,3,gen_random_uuid(),hash,'deposit',jsonb_build_object('amount_minor',6000,'reference','rollback-deposit-1-'||id1,'evidence','Same bank transaction','occurred_at',now()));RAISE EXCEPTION 'duplicate bank transaction';EXCEPTION WHEN unique_violation THEN NULL;END;
 PERFORM b2b_order_action(admin_id,id2,true,3,gen_random_uuid(),hash,'deposit',jsonb_build_object('amount_minor',500,'reference','rollback-deposit-3-'||id1,'evidence','Cancel refund test','occurred_at',now()));
 PERFORM b2b_order_action(admin_id,id2,true,4,gen_random_uuid(),hash,'cancel','{"message":"Customer cancelled before shipment"}');
 PERFORM b2b_order_action(admin_id,id2,true,5,gen_random_uuid(),hash,'refund',jsonb_build_object('amount_minor',500,'reference','rollback-refund-3-'||id1,'evidence','Full cancelled refund','occurred_at',now()));
 IF (SELECT status FROM b2b_orders WHERE id=id2)<>'cancelled' THEN RAISE EXCEPTION 'cancel status lost';END IF;
 BEGIN UPDATE b2b_order_items SET snapshot=snapshot||'{"name":"tamper"}' WHERE order_id=id1;RAISE EXCEPTION 'mutable snapshot';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'order history is immutable' THEN RAISE;END IF;END;
 BEGIN DELETE FROM b2b_order_events WHERE order_id=id1;RAISE EXCEPTION 'mutable history';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'order history is immutable' THEN RAISE;END IF;END;
 -- Company scope and membership changes between price calculation and commit.
 INSERT INTO companies(name,kind,country,created_by) VALUES('Rollback order company','domestic','KR',buyer) RETURNING id INTO cid;
 INSERT INTO company_members(company_id,user_id,role) VALUES(cid,buyer,'owner');
 BEGIN PERFORM b2b_order_submit(buyer,NULL,gen_random_uuid(),hash,delivery,'{}',lines);RAISE EXCEPTION 'membership race';EXCEPTION WHEN serialization_failure THEN NULL;END;
 id2:=b2b_order_submit(buyer,cid,gen_random_uuid(),hash,delivery,'{}',lines);
 BEGIN PERFORM b2b_order_detail(other_buyer,id2,false);RAISE EXCEPTION 'cross company';EXCEPTION WHEN no_data_found THEN NULL;END;
 INSERT INTO company_members(company_id,user_id,role) VALUES(cid,other_buyer,'member');
 PERFORM b2b_order_detail(other_buyer,id2,false);
 UPDATE company_members SET status='suspended' WHERE user_id=buyer;
 BEGIN PERFORM b2b_order_detail(buyer,id2,false);RAISE EXCEPTION 'former member';EXCEPTION WHEN no_data_found THEN NULL;END;
 PERFORM b2b_order_detail(buyer,id1,false);
 UPDATE customer_accounts SET status='suspended' WHERE id=buyer;
 BEGIN PERFORM b2b_order_replay(buyer,k,hash);RAISE EXCEPTION 'suspended replay';EXCEPTION WHEN no_data_found THEN NULL;END;
 UPDATE customer_accounts SET status='active' WHERE id=buyer;
 UPDATE user_profiles SET status='suspended' WHERE id=admin_id;
 BEGIN PERFORM b2b_order_detail(admin_id,id1,true);RAISE EXCEPTION 'revoked role';EXCEPTION WHEN no_data_found THEN NULL;END;
 UPDATE user_profiles SET status='active' WHERE id=admin_id;
 INSERT INTO b2b_price_revisions(product_id,price_list_id,version,status,price_unit,unit_price_krw,tax_code,vat_included,minimum_order_unit,minimum_order_quantity,valid_from,valid_until,review_source,change_reason,created_by,approved_by,approved_at)
 VALUES(product,'00000000-0000-4000-8000-000000000201',999999,'approved','EA',1200,'vat10',true,'EA',1,now()-interval '2 days',now()-interval '1 day','rollback only','rollback only',admin_id,admin_id,now()) RETURNING id INTO expired_price;
 BEGIN PERFORM b2b_order_submit(buyer,NULL,gen_random_uuid(),hash,delivery,'{}',lines);RAISE EXCEPTION 'stale source accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM b2b_order_submit(buyer,NULL,gen_random_uuid(),hash,delivery,'{}',jsonb_build_array((lines->0)||jsonb_build_object('price_version_id',expired_price)));RAISE EXCEPTION 'expired source accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 IF b2b_order_replay(buyer,k,hash)<>id1 THEN RAISE EXCEPTION 'replay fails after price expires';END IF;
END $$;
