-- Run after migration inside BEGIN ... ROLLBACK. No real document/PDF is issued.
DO $$
DECLARE admin_id uuid:=gen_random_uuid();buyer uuid:=gen_random_uuid();other_buyer uuid:=gen_random_uuid();staff uuid:=gen_random_uuid();
 product text;price uuid;rate uuid;inq uuid;quote uuid;key1 uuid:=gen_random_uuid();accept_key uuid:=gen_random_uuid();hash1 text:=repeat('a',64);
 snap jsonb;qs jsonb;d b2b_pi_documents;d2 b2b_pi_documents;replay b2b_pi_documents;v integer;n integer;t text;company_ref uuid;
BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_pi_settings','b2b_pi_documents','b2b_pi_events'] LOOP
 IF has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('authenticated','public.'||t,'SELECT')
 OR NOT(SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) THEN RAISE EXCEPTION 'PI private tables leaked';END IF;END LOOP;
 IF has_function_privilege('authenticated','public.b2b_pi_prepare(uuid,uuid,uuid,integer,uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.b2b_pi_customer_action(uuid,uuid,text,text,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'PI public RPC open';END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='b2b-proforma' AND public) OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='b2b_pi_private_objects' AND permissive='RESTRICTIVE') THEN RAISE EXCEPTION 'PI storage protection missing'; END IF;
 INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) VALUES
 (admin_id,admin_id||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (buyer,buyer||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (other_buyer,other_buyer||'@example.invalid','authenticated','authenticated',now(),now(),now());
 INSERT INTO user_profiles(id,email,name,role,status) VALUES(admin_id,admin_id||'@example.invalid','PI test admin','admin','active'),(staff,staff||'@example.invalid','PI test staff','inquiry_staff','active');
 INSERT INTO customer_accounts(id,email,name) VALUES(buyer,buyer||'@example.invalid','PI test buyer'),(other_buyer,other_buyer||'@example.invalid','Other buyer');
 SELECT id INTO product FROM products ORDER BY id LIMIT 1;
 INSERT INTO b2b_price_revisions(product_id,price_list_id,version,status,price_unit,unit_price_krw,tax_code,vat_included,ea_per_carton,minimum_order_unit,minimum_order_quantity,export_moq_ctn,valid_from,valid_until,fob_status,loading_port,cost_review,review_source,change_reason,created_by,approved_by,approved_at)
 VALUES(product,'00000000-0000-4000-8000-000000000201',999999,'approved','CTN',110000,'vat10',true,10,'CTN',1,1,now()-interval '1 day',now()+interval '2 days','included','Busan','test only','rollback only','rollback only',admin_id,admin_id,now()) RETURNING id INTO price;
 INSERT INTO b2b_exchange_rates(krw_per_usd,source,observed_at,valid_until,reason,created_by) VALUES(1250,'rollback only',now(),now()+interval '2 days','rollback only',admin_id) RETURNING id INTO rate;
 INSERT INTO commercial_inquiries(kind,company,contact_name,email,country,incoterms,items,submitted_by) VALUES('export_rfq','PI test','Buyer','pi-test@example.invalid','Japan','FOB','[]',buyer) RETURNING id INTO inq;
 qs:=jsonb_build_object('kind','quotation_draft','inquiry_id',inq,'issues','[]'::jsonb,'valid_until',now()+interval '2 days','proposed_total_minor',24000,'exchange_rate',jsonb_build_object('id',rate),'lines',jsonb_build_array(jsonb_build_object('price_source',jsonb_build_object('id',price))));
 INSERT INTO b2b_quote_drafts(inquiry_id,version,snapshot,created_by,request_key,request_hash) VALUES(inq,1,qs,admin_id,gen_random_uuid(),hash1) RETURNING id INTO quote;
 snap:=jsonb_build_object('kind','proforma_invoice','valid_until',now()+interval '1 day','total_minor',24000,'change_reason','Rollback test only');
 BEGIN PERFORM b2b_pi_prepare(staff,inq,quote,1,NULL,key1,hash1,snap);RAISE EXCEPTION 'staff must not issue';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 SELECT * INTO d FROM b2b_pi_prepare(admin_id,inq,quote,1,NULL,key1,hash1,snap);
 SELECT * INTO replay FROM b2b_pi_prepare(admin_id,inq,quote,1,NULL,key1,hash1,snap);
 IF d.id<>replay.id OR d.version<>1 THEN RAISE EXCEPTION 'duplicate reservation';END IF;
 BEGIN PERFORM b2b_pi_prepare(admin_id,inq,quote,1,NULL,key1,repeat('b',64),snap);RAISE EXCEPTION 'different payload key';EXCEPTION WHEN unique_violation THEN NULL;END;
 BEGIN PERFORM b2b_pi_prepare(admin_id,inq,quote,2,NULL,gen_random_uuid(),hash1,snap);RAISE EXCEPTION 'parallel reservation';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM b2b_pi_customer_action(buyer,d.id,'view','',gen_random_uuid(),hash1);RAISE EXCEPTION 'preparing private';EXCEPTION WHEN no_data_found THEN NULL;END;
 BEGIN UPDATE b2b_pi_documents SET snapshot='{}' WHERE id=d.id;RAISE EXCEPTION 'mutable PI content';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'PI content is immutable' THEN RAISE;END IF;END;
 SELECT * INTO d FROM b2b_pi_finish(admin_id,d.id,'pi/'||d.id||'.pdf',hash1,123,false);
 PERFORM b2b_pi_finish(admin_id,d.id,'pi/'||d.id||'.pdf',hash1,123,false);
 IF d.status<>'issued' OR (SELECT count(*) FROM b2b_pi_events WHERE document_id=d.id AND event='issued')<>1 THEN RAISE EXCEPTION 'duplicate issue';END IF;
 BEGIN PERFORM b2b_pi_customer_action(other_buyer,d.id,'accept','',gen_random_uuid(),hash1);RAISE EXCEPTION 'cross customer access';EXCEPTION WHEN no_data_found THEN NULL;END;
 SELECT * INTO d FROM b2b_pi_customer_action(buyer,d.id,'accept','',accept_key,hash1);
 PERFORM b2b_pi_customer_action(buyer,d.id,'accept','',accept_key,hash1);
 IF d.accepted_at IS NULL OR (SELECT count(*) FROM b2b_pi_events WHERE document_id=d.id AND event='accept')<>1 THEN RAISE EXCEPTION 'acceptance replay';END IF;
 BEGIN PERFORM b2b_pi_prepare(admin_id,inq,quote,2,d.id,gen_random_uuid(),hash1,snap);RAISE EXCEPTION 'accepted overwrite';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM b2b_pi_customer_action(buyer,d.id,'request_changes','Please revise shipping date',gen_random_uuid(),hash1);
 SELECT * INTO d2 FROM b2b_pi_prepare(admin_id,inq,quote,2,d.id,gen_random_uuid(),hash1,snap);
 SELECT * INTO d2 FROM b2b_pi_finish(admin_id,d2.id,'pi/'||d2.id||'.pdf',hash1,123,false);
 IF (SELECT status FROM b2b_pi_documents WHERE id=d.id)<>'issued' OR (SELECT accepted_at FROM b2b_pi_documents WHERE id=d.id) IS NULL THEN RAISE EXCEPTION 'accepted base lost on proposal';END IF;
 BEGIN PERFORM b2b_pi_customer_action(buyer,d.id,'accept','',gen_random_uuid(),hash1);RAISE EXCEPTION 'old version acceptance';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM b2b_pi_customer_action(buyer,d2.id,'accept','',gen_random_uuid(),hash1);
 IF (SELECT status FROM b2b_pi_documents WHERE id=d.id)<>'superseded' THEN RAISE EXCEPTION 'base not superseded after replacement accepted';END IF;
 BEGIN UPDATE b2b_pi_documents SET pdf_sha256=repeat('c',64) WHERE id=d2.id;RAISE EXCEPTION 'mutable PDF';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'PI file is immutable' THEN RAISE;END IF;END;
 BEGIN DELETE FROM b2b_pi_documents WHERE id=d2.id;RAISE EXCEPTION 'deleted PI';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'PI history is immutable' THEN RAISE;END IF;END;
 -- Expiry is evaluated in DB; use a separately inserted synthetic expired issued document.
 INSERT INTO commercial_inquiries(kind,company,contact_name,email,items,submitted_by) VALUES('export_rfq','Expiry','Buyer','expiry@example.invalid','[]',buyer) RETURNING id INTO inq;
 INSERT INTO b2b_pi_documents(number,inquiry_id,quote_id,version,snapshot,status,created_by,request_key,request_hash,pdf_path,pdf_sha256,pdf_bytes,issued_at)
 VALUES('ROLLBACK-EXPIRED-'||inq,inq,quote,1,snap||jsonb_build_object('valid_until',now()-interval '1 minute'),'issued',admin_id,gen_random_uuid(),hash1,'test-only.pdf',hash1,123,now()) RETURNING * INTO d;
 BEGIN PERFORM b2b_pi_customer_action(buyer,d.id,'accept','',gen_random_uuid(),hash1);RAISE EXCEPTION 'expired accepted';EXCEPTION WHEN serialization_failure THEN NULL;END;
 UPDATE commercial_inquiries SET submitted_by=NULL WHERE id=inq;
 BEGIN PERFORM b2b_pi_customer_action(other_buyer,d.id,'view','',gen_random_uuid(),hash1);RAISE EXCEPTION 'guest PI leaked';EXCEPTION WHEN no_data_found THEN NULL;END;
 UPDATE commercial_inquiries SET submitted_by=buyer WHERE id=inq;
 -- Company scope and revoked membership.
 INSERT INTO companies(name,kind,country,created_by) VALUES('Rollback company','overseas','Japan',buyer) RETURNING id INTO company_ref;
 INSERT INTO company_members(company_id,user_id,role) VALUES(company_ref,buyer,'owner');
 UPDATE commercial_inquiries SET company_id=company_ref WHERE id=inq;
 PERFORM b2b_pi_customer_action(buyer,d.id,'view','',gen_random_uuid(),hash1);
 UPDATE company_members SET status='suspended' WHERE user_id=buyer;
 BEGIN PERFORM b2b_pi_customer_action(buyer,d.id,'download','',gen_random_uuid(),hash1);RAISE EXCEPTION 'revoked company scope';EXCEPTION WHEN no_data_found THEN NULL;END;
END $$;
