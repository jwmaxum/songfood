-- Execute inside a transaction after the migration; caller must ROLLBACK fixtures.
DO $$
DECLARE actor uuid:=gen_random_uuid(); viewer uuid:=gen_random_uuid(); product_id text; key1 uuid:=gen_random_uuid();
 scope text:=repeat('a',64); hash1 text:=repeat('b',64); payload jsonb; first jsonb; replay jsonb; id1 uuid;
 action_key uuid:=gen_random_uuid(); quote_key uuid:=gen_random_uuid(); changed jsonb; q b2b_quote_drafts;
 n b2b_notification_outbox; n_id uuid; t text; count1 integer;
BEGIN
 IF has_function_privilege('anon','public.b2b_submit_inquiry(text,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.b2b_crm_change(uuid,uuid,integer,uuid,text,text,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.b2b_save_quote_draft(uuid,uuid,integer,uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.b2b_deliver_test_notification(uuid,uuid,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'public RPC access is open'; END IF;
 FOREACH t IN ARRAY ARRAY['b2b_inquiry_requests','b2b_inquiry_activities','b2b_quote_drafts','b2b_notification_outbox','b2b_notification_attempts','b2b_notification_test_inbox'] LOOP
  IF has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('authenticated','public.'||t,'SELECT')
   OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass)
   THEN RAISE EXCEPTION 'RLS/privilege failure: %',t; END IF;
 END LOOP;
 SELECT id INTO product_id FROM products ORDER BY id LIMIT 1;
 IF product_id IS NULL THEN RAISE EXCEPTION 'A catalogue product is required for the rollback test'; END IF;
 INSERT INTO user_profiles(id,email,name,role,status) VALUES
  (actor,actor::text||'@example.invalid','Rollback CRM staff','inquiry_staff','active'),
  (viewer,viewer::text||'@example.invalid','Rollback viewer','viewer','active');
 payload:=jsonb_build_object('kind','export_rfq','company','Rollback test','contact_name','Test','email','crm-rollback@example.invalid',
  'country','Japan','incoterms','FOB','items',jsonb_build_array(jsonb_build_object('product_id',product_id,'product_name','Test','quantity_cartons',3)),
  'required_documents',jsonb_build_array('Specification'));
 first:=b2b_submit_inquiry(scope,key1,hash1,payload); id1:=(first->>'id')::uuid;
 replay:=b2b_submit_inquiry(scope,key1,hash1,payload);
 IF first->>'id'<>replay->>'id' OR replay->>'replayed'<>'true' THEN RAISE EXCEPTION 'replay failed'; END IF;
 SELECT count(*) INTO count1 FROM b2b_inquiry_requests WHERE scope_hash=scope AND request_key=key1;
 IF count1<>1 THEN RAISE EXCEPTION 'duplicate request rows'; END IF;
 BEGIN PERFORM b2b_submit_inquiry(scope,key1,repeat('c',64),payload); RAISE EXCEPTION 'expected duplicate-key conflict';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM b2b_crm_change(viewer,id1,1,gen_random_uuid(),hash1,'status','{"status":"reviewing"}'); RAISE EXCEPTION 'expected permission failure';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 changed:=b2b_crm_change(actor,id1,1,action_key,hash1,'assign',jsonb_build_object('assigned_to',actor));
 replay:=b2b_crm_change(actor,id1,1,action_key,hash1,'assign',jsonb_build_object('assigned_to',actor));
 IF changed->>'revision'<>'2' OR replay->>'replayed'<>'true' THEN RAISE EXCEPTION 'assignment replay failed'; END IF;
 BEGIN PERFORM b2b_crm_change(actor,id1,1,gen_random_uuid(),hash1,'status','{"status":"closed"}'); RAISE EXCEPTION 'expected stale revision';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM b2b_crm_change(actor,id1,2,gen_random_uuid(),hash1,'assign',jsonb_build_object('assigned_to',viewer)); RAISE EXCEPTION 'expected invalid assignee';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM b2b_crm_change(actor,id1,2,gen_random_uuid(),hash1,'note','{"message":"Private staff note"}');
 PERFORM b2b_crm_change(actor,id1,3,gen_random_uuid(),hash1,'reply','{"message":"Customer-visible reply"}');
 IF (SELECT count(*) FROM b2b_inquiry_activities WHERE inquiry_id=id1 AND visibility='customer' AND message='Private staff note')<>0 THEN RAISE EXCEPTION 'internal note exposed'; END IF;
 SELECT * INTO q FROM b2b_save_quote_draft(actor,id1,4,NULL,quote_key,hash1,jsonb_build_object('kind','quotation_draft','inquiry_id',id1,'test_only',true));
 IF q.version<>1 THEN RAISE EXCEPTION 'first quote version failed'; END IF;
 PERFORM b2b_save_quote_draft(actor,id1,4,NULL,quote_key,hash1,jsonb_build_object('kind','quotation_draft','inquiry_id',id1,'ignored_retry_payload',true));
 IF (SELECT count(*) FROM b2b_quote_drafts WHERE inquiry_id=id1)<>1 THEN RAISE EXCEPTION 'duplicate quote'; END IF;
 BEGIN UPDATE b2b_quote_drafts SET snapshot='{}' WHERE id=q.id; RAISE EXCEPTION 'expected immutable history';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CRM history is immutable' THEN RAISE; END IF; END;
 BEGIN DELETE FROM b2b_inquiry_activities WHERE inquiry_id=id1; RAISE EXCEPTION 'expected immutable history';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'CRM history is immutable' THEN RAISE; END IF; END;
 BEGIN PERFORM b2b_save_quote_draft(actor,id1,5,NULL,gen_random_uuid(),hash1,jsonb_build_object('kind','quotation_draft','inquiry_id',id1)); RAISE EXCEPTION 'expected stale quote base';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 SELECT * INTO q FROM b2b_save_quote_draft(actor,id1,5,q.id,gen_random_uuid(),hash1,jsonb_build_object('kind','quotation_draft','inquiry_id',id1,'test_only',true));
 IF q.version<>2 THEN RAISE EXCEPTION 'second quote version failed'; END IF;
 SELECT id INTO n_id FROM b2b_notification_outbox WHERE inquiry_id=id1 ORDER BY created_at,id LIMIT 1;
 SELECT * INTO n FROM b2b_deliver_test_notification(actor,n_id,true);
 IF n.status<>'failed' OR n.attempts<>1 THEN RAISE EXCEPTION 'test failure not recorded'; END IF;
 SELECT * INTO n FROM b2b_deliver_test_notification(actor,n_id,false);
 IF n.status<>'delivered' OR n.attempts<>2 THEN RAISE EXCEPTION 'retry not delivered'; END IF;
 PERFORM b2b_deliver_test_notification(actor,n_id,false);
 IF (SELECT count(*) FROM b2b_notification_test_inbox WHERE notification_id=n_id)<>1
 OR (SELECT attempts FROM b2b_notification_outbox WHERE id=n_id)<>2 THEN RAISE EXCEPTION 'delivery duplicated'; END IF;
END $$;
