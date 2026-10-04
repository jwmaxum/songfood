-- B2B-13: initial operating snapshot, verified assignees and actual mail follow-up.
BEGIN;
CREATE FUNCTION public.b2b_ops_eligible_staff(p_id uuid,p_kind text DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_profiles p JOIN auth.users a ON a.id=p.id
 WHERE p.id=p_id AND p.status='active' AND p.staff_removed_at IS NULL
 AND a.email_confirmed_at IS NOT NULL AND (a.banned_until IS NULL OR a.banned_until<=now())
 AND p.role IN('admin','product_staff','inquiry_staff','order_staff')
 AND (p_kind IS NULL OR p.role='admin' OR p.role=CASE p_kind WHEN 'inquiry' THEN 'inquiry_staff' WHEN 'order' THEN 'order_staff' END));
$$;
CREATE OR REPLACE FUNCTION public.b2b_ops_plan(p_actor uuid,p_kind text,p_id uuid,p_expected integer,p_assigned uuid,p_due timestamptz,p_message text,p_key uuid,p_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_role text; rev integer; old_assigned uuid; old_due timestamptz; previous_hash text; previous_actor uuid; changes jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 SELECT u.role INTO v_role FROM public.user_profiles u WHERE u.id=p_actor AND u.status='active';
 IF NOT public.b2b_ops_eligible_staff(p_actor,p_kind) OR v_role IS NULL OR p_kind NOT IN('inquiry','order') OR NOT(v_role='admin' OR v_role=CASE p_kind WHEN 'inquiry' THEN 'inquiry_staff' ELSE 'order_staff' END) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_kind IS NULL OR p_key IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR p_expected IS NULL OR p_expected<1 OR coalesce(length(trim(p_message)),0) NOT BETWEEN 3 AND 2000
 OR (p_due IS NOT NULL AND (NOT isfinite(p_due) OR p_due<'2000-01-01' OR p_due>'2100-01-01')) THEN RAISE EXCEPTION 'invalid plan' USING ERRCODE='22023';END IF;
 IF p_kind='inquiry' THEN
  SELECT revision,assigned_to,due_at INTO rev,old_assigned,old_due FROM public.commercial_inquiries WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing' USING ERRCODE='P0002';END IF;
  SELECT request_hash,actor_id INTO previous_hash,previous_actor FROM public.b2b_inquiry_activities WHERE inquiry_id=p_id AND request_key=p_key;
 ELSE
  SELECT revision,assigned_to,due_at INTO rev,old_assigned,old_due FROM public.b2b_orders WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing' USING ERRCODE='P0002';END IF;
  SELECT request_hash,actor_id INTO previous_hash,previous_actor FROM public.b2b_order_events WHERE order_id=p_id AND actor_id=p_actor AND request_key=p_key;
 END IF;
 IF FOUND THEN
  IF previous_hash IS DISTINCT FROM p_hash OR previous_actor IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'replay conflict' USING ERRCODE='23505';END IF;
  RETURN;
 END IF;
 IF rev<>p_expected THEN RAISE EXCEPTION 'stale plan' USING ERRCODE='40001';END IF;
 IF p_assigned IS NOT NULL AND NOT public.b2b_ops_eligible_staff(p_assigned,p_kind)
 THEN RAISE EXCEPTION 'invalid assignee' USING ERRCODE='22023';END IF;
 changes:=jsonb_build_object('from',old_assigned,'to',p_assigned,'due_from',old_due,'due_to',p_due);
 IF p_kind='inquiry' THEN
  UPDATE public.commercial_inquiries SET assigned_to=p_assigned,due_at=p_due,revision=revision+1,updated_at=now() WHERE id=p_id;
  INSERT INTO public.b2b_inquiry_activities(inquiry_id,actor_id,event,visibility,message,details,request_key,request_hash)
  VALUES(p_id,p_actor,'work_plan','internal',p_message,changes,p_key,p_hash);
 ELSE
  UPDATE public.b2b_orders SET assigned_to=p_assigned,due_at=p_due,revision=revision+1,updated_at=now() WHERE id=p_id;
  INSERT INTO public.b2b_order_events(order_id,actor_id,action,message,details,request_key,request_hash) VALUES(p_id,p_actor,'work_plan',p_message,changes,p_key,p_hash);
 END IF;
END $$;


CREATE OR REPLACE VIEW public.b2b_ops_work AS WITH work AS (
SELECT 'inquiry'::text kind,i.id,i.company title,i.contact_name||' · '||coalesce(i.country,'국내') subtitle,
 i.id::text||' '||i.company||' '||i.contact_name||' '||i.email||' '||coalesce(i.country,'') search,
 i.status,i.assigned_to,i.due_at,i.revision,i.created_at,
 array_remove(ARRAY[
 CASE WHEN EXISTS(SELECT 1 FROM public.b2b_email_deliveries e JOIN public.b2b_notification_outbox n ON n.id=e.notification_id WHERE n.inquiry_id=i.id AND e.state='failed') THEN 'mail_failed' END,
 CASE WHEN EXISTS(SELECT 1 FROM public.b2b_email_deliveries e JOIN public.b2b_notification_outbox n ON n.id=e.notification_id WHERE n.inquiry_id=i.id AND (e.state='uncertain' OR (e.state='sending' AND (e.lease_until IS NULL OR e.lease_until<=now())))) THEN 'mail_unknown' END,
 CASE WHEN EXISTS(SELECT 1 FROM public.b2b_email_deliveries e JOIN public.b2b_notification_outbox n ON n.id=e.notification_id WHERE n.inquiry_id=i.id AND e.state='queued') THEN 'mail_queued' END,
 CASE WHEN i.status IN('new','reviewing') AND i.kind='export_rfq' THEN 'rfq' END,
 CASE WHEN i.status IN('new','reviewing') AND i.kind='domestic_wholesale' THEN 'inquiry' END,
 CASE WHEN i.status<>'closed' AND q.id IS NOT NULL AND (d.id IS NULL OR d.quote_id<>q.id OR d.status='cancelled') THEN 'pi_review' END,
 CASE WHEN d.status='preparing' THEN 'pi_preparing' END,
 CASE WHEN d.status='issued' AND d.accepted_at IS NULL AND (d.snapshot->>'valid_until')::timestamptz<=now() THEN 'pi_expired' END,
 CASE WHEN d.status='issued' AND d.accepted_at IS NULL AND (d.snapshot->>'valid_until')::timestamptz>now() AND (d.snapshot->>'valid_until')::timestamptz<=now()+interval '3 days' THEN 'pi_soon' END,
 CASE WHEN d.status='issued' AND d.accepted_at IS NULL AND d.change_requested_at IS NOT NULL THEN 'pi_changes' END,
 CASE WHEN EXISTS(SELECT 1 FROM public.b2b_notification_outbox n WHERE n.inquiry_id=i.id AND n.status='failed') THEN 'test_failed' END,
 CASE WHEN EXISTS(SELECT 1 FROM public.b2b_notification_outbox n WHERE n.inquiry_id=i.id AND n.status='queued') THEN 'test_queued' END
 ],NULL)::text[] tags
FROM public.commercial_inquiries i
LEFT JOIN LATERAL(SELECT * FROM public.b2b_quote_drafts WHERE inquiry_id=i.id ORDER BY version DESC LIMIT 1) q ON true
LEFT JOIN LATERAL(SELECT * FROM public.b2b_pi_documents WHERE inquiry_id=i.id ORDER BY version DESC LIMIT 1) d ON true
UNION ALL
SELECT 'order',o.id,o.number,coalesce(o.customer->>'company','')||' · '||coalesce(o.customer->>'name',''),
 o.id::text||' '||o.number||' '||coalesce(o.customer->>'company','')||' '||coalesce(o.customer->>'name','')||' '||coalesce(o.customer->>'email',''),
 o.status,o.assigned_to,o.due_at,o.revision,o.created_at,
 array_remove(ARRAY[
 CASE WHEN o.status='requested' THEN 'order_review' END,
 CASE WHEN o.status='reviewed' THEN 'customer_confirm' END,
 CASE WHEN o.status='confirmed' AND o.paid_minor-o.refunded_minor<o.total_minor-o.credit_minor THEN 'unpaid' END,
 CASE WHEN o.status='confirmed' AND o.accepted_at IS NOT NULL AND o.claim_status<>'open' AND o.paid_minor-o.refunded_minor>=o.total_minor-o.credit_minor
 AND EXISTS(SELECT 1 FROM public.b2b_order_items it WHERE it.order_id=o.id AND it.shipped_quantity+it.cancelled_quantity<(it.snapshot->>'quantity')::integer) THEN 'shipping' END,
 CASE WHEN o.paid_minor-o.refunded_minor>coalesce(o.total_minor,o.goods_total_minor)-o.credit_minor THEN 'refund' END,
 CASE WHEN o.claim_status='open' THEN 'claim' END
 ],NULL)::text[]
FROM public.b2b_orders o)
SELECT kind,id,title,subtitle,search,status,assigned_to,due_at,revision,created_at,
 tags||CASE WHEN assigned_to IS NOT NULL AND NOT public.b2b_ops_eligible_staff(assigned_to,kind)
 AND (cardinality(tags)>0 OR status NOT IN('closed','completed','cancelled')) THEN ARRAY['reassignment'] ELSE ARRAY[]::text[] END tags
FROM work;

REVOKE ALL ON public.b2b_ops_work FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.b2b_ops_work TO service_role;


CREATE OR REPLACE FUNCTION public.b2b_ops_snapshot(p_actor uuid,p_mode text,p_q text DEFAULT '',p_category text DEFAULT '',p_assigned text DEFAULT '',p_due text DEFAULT '',p_page integer DEFAULT 1,p_kind text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_role text; result jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 SELECT u.role INTO v_role FROM public.user_profiles u WHERE u.id=p_actor AND u.status='active';
 IF NOT public.b2b_ops_eligible_staff(p_actor) OR v_role IS NULL OR v_role NOT IN('admin','product_staff','inquiry_staff','order_staff') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_mode IS NULL OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR length(p_q)>120 OR p_mode NOT IN('work','documents','audit','contacts','quality')
 OR p_due NOT IN('','overdue','soon','unset','active') OR p_kind NOT IN('','inquiry','order')
 THEN RAISE EXCEPTION 'invalid filter' USING ERRCODE='22023';END IF;
 IF (p_mode IN('audit','contacts') AND v_role<>'admin') OR (p_mode='documents' AND v_role NOT IN('admin','inquiry_staff')) OR (p_mode='quality' AND v_role NOT IN('admin','product_staff'))
 THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 IF p_mode='quality' THEN
  SELECT jsonb_build_object('as_of',now(),
   'products',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'sku',sku,'name',name,'origin',coalesce(nullif(country_of_origin,''),origin),'storage',storage,'shelf_life',shelf_life) ORDER BY id) FROM public.products),'[]'),
   'lists',coalesce((SELECT jsonb_agg(to_jsonb(l)) FROM public.b2b_price_lists l WHERE active),'[]'),
   'revisions',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY version DESC,id) FROM public.b2b_price_revisions r),'[]'),
   'rate',(SELECT to_jsonb(r) FROM public.b2b_exchange_rates r ORDER BY created_at DESC,id LIMIT 1)) INTO result;
 ELSIF p_mode='work' THEN
  WITH eligible AS MATERIALIZED(
   SELECT w.*,s.name assigned_name FROM public.b2b_ops_work w LEFT JOIN public.user_profiles s ON s.id=w.assigned_to
   WHERE (v_role='admin' OR (w.kind='inquiry' AND v_role='inquiry_staff') OR (w.kind='order' AND v_role='order_staff'))
   AND (p_kind='' OR w.kind=p_kind) AND (p_q='' OR position(lower(p_q) IN lower(w.search))>0)
   AND (p_assigned='' OR (p_assigned='mine' AND w.assigned_to=p_actor) OR (p_assigned='unassigned' AND w.assigned_to IS NULL) OR (p_assigned='reassign' AND 'reassignment'=ANY(w.tags)) OR w.assigned_to::text=p_assigned)
   AND (p_due='' OR (p_due='active' AND (cardinality(w.tags)>0 OR w.status NOT IN('closed','completed','cancelled'))) OR (p_due='unset' AND w.due_at IS NULL) OR (p_due='overdue' AND w.due_at<now() AND (cardinality(w.tags)>0 OR w.status NOT IN('closed','completed','cancelled')))
    OR (p_due='soon' AND w.due_at>=now() AND w.due_at<now()+interval '3 days' AND (cardinality(w.tags)>0 OR w.status NOT IN('closed','completed','cancelled'))))
  ),filtered AS MATERIALIZED(SELECT * FROM eligible WHERE p_category='' OR p_category=ANY(tags)),
  numbered AS(SELECT * FROM filtered ORDER BY due_at NULLS LAST,created_at,id OFFSET (p_page-1)*30 LIMIT 30)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',coalesce((SELECT jsonb_agg(to_jsonb(n)-'search' ORDER BY due_at NULLS LAST,created_at,id) FROM numbered n),'[]'),
   'counts',coalesce((SELECT jsonb_object_agg(tag,n) FROM(SELECT unnest(tags) tag,count(*) n FROM eligible GROUP BY tag) c),'{}'),
   'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'role',u.role) ORDER BY u.name,u.id) FROM public.user_profiles u WHERE public.b2b_ops_eligible_staff(u.id) AND (u.role='admin' OR (u.role='inquiry_staff' AND v_role IN('admin','inquiry_staff')) OR (u.role='order_staff' AND v_role IN('admin','order_staff')))),'[]')) INTO result;
 ELSIF p_mode='documents' THEN
  WITH eligible AS MATERIALIZED(
   SELECT d.id,d.inquiry_id,d.number title,'PI v'||d.version||' · '||i.company subtitle,d.created_at,i.assigned_to,i.due_at,
    CASE WHEN d.status<>'issued' THEN d.status WHEN d.accepted_at IS NOT NULL THEN 'accepted'
    WHEN (d.snapshot->>'valid_until')::timestamptz<=now() THEN 'expired' WHEN d.change_requested_at IS NOT NULL THEN 'changes_requested' ELSE 'issued' END status,
    d.snapshot->>'valid_until' valid_until
   FROM public.b2b_pi_documents d JOIN public.commercial_inquiries i ON i.id=d.inquiry_id
   WHERE p_q='' OR position(lower(p_q) IN lower(d.number||' '||i.company||' '||d.id::text))>0
  ), filtered AS MATERIALIZED(SELECT * FROM eligible WHERE p_category='' OR status=p_category),
  paged AS(SELECT * FROM filtered ORDER BY created_at DESC,id OFFSET (p_page-1)*30 LIMIT 30)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id) FROM paged p),'[]'),
   'counts',coalesce((SELECT jsonb_object_agg(status,n) FROM(SELECT status,count(*) n FROM eligible GROUP BY status)c),'{}')) INTO result;
 ELSIF p_mode='contacts' THEN
  WITH eligible AS MATERIALIZED(
   SELECT a.id,a.name title,a.email subtitle,a.status,a.created_at,c.id company_id,c.name company_name,c.status company_status,m.status membership_status,
    (SELECT l.name FROM public.b2b_price_lists l WHERE l.company_id=c.id AND l.active) price_list
   FROM public.customer_accounts a LEFT JOIN public.company_members m ON m.user_id=a.id LEFT JOIN public.companies c ON c.id=m.company_id
   WHERE p_q='' OR position(lower(p_q) IN lower(a.id::text||' '||a.name||' '||a.email||' '||coalesce(c.name,'')))>0
  ),filtered AS MATERIALIZED(SELECT * FROM eligible WHERE p_category='' OR (p_category='personal' AND company_id IS NULL) OR (p_category='company' AND company_id IS NOT NULL)
   OR (p_category='suspended' AND (status='suspended' OR company_status='suspended' OR membership_status='suspended'))),
  paged AS(SELECT * FROM filtered ORDER BY created_at DESC,id OFFSET (p_page-1)*30 LIMIT 30)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id) FROM paged p),'[]')) INTO result;
 ELSE
  WITH events AS(
   SELECT 'access' source,a.id,coalesce(a.company_id,a.subject_id) target_id,a.actor_id,a.action title,coalesce(a.reason,'') subtitle,a.created_at FROM public.b2b_access_audit a
   UNION ALL SELECT 'pricing',a.id,a.record_id,a.actor_id,a.action,coalesce(a.details->>'reason',a.details->>'change_reason',''),a.created_at FROM public.b2b_pricing_audit a
   UNION ALL SELECT 'inquiry',a.id,a.inquiry_id,a.actor_id,a.event,a.message,a.created_at FROM public.b2b_inquiry_activities a
   UNION ALL SELECT 'pi',e.id,d.inquiry_id,e.actor_id,e.event,e.message,e.created_at FROM public.b2b_pi_events e LEFT JOIN public.b2b_pi_documents d ON d.id=e.document_id
   UNION ALL SELECT 'order',e.id,e.order_id,e.actor_id,e.action,e.message,e.created_at FROM public.b2b_order_events e
  ),filtered AS MATERIALIZED(
   SELECT e.*,u.name actor_name FROM events e LEFT JOIN public.user_profiles u ON u.id=e.actor_id
   WHERE (p_category='' OR e.source=p_category) AND (p_q='' OR position(lower(p_q) IN lower(e.title||' '||e.subtitle||' '||coalesce(e.target_id::text,'')||' '||coalesce(u.name,'')))>0)
  ),paged AS(SELECT * FROM filtered ORDER BY created_at DESC,id,source OFFSET (p_page-1)*30 LIMIT 30)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id,source) FROM paged p),'[]')) INTO result;
 END IF;
 RETURN result||jsonb_build_object('as_of',now(),'page',p_page,'page_size',30,'role',v_role);
END $$;


CREATE FUNCTION public.b2b_initial_operations(p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_role text;result jsonb;
BEGIN
 IF NOT public.b2b_ops_eligible_staff(p_actor) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';END IF;
 SELECT p.role INTO v_role FROM public.user_profiles p WHERE p.id=p_actor;
 WITH eligible AS MATERIALIZED(
  SELECT w.*,(cardinality(w.tags)>0 OR w.status NOT IN('closed','completed','cancelled')) active
  FROM public.b2b_ops_work w WHERE v_role='admin' OR (v_role='inquiry_staff' AND w.kind='inquiry') OR (v_role='order_staff' AND w.kind='order')
 ),metrics AS(
  SELECT count(*) FILTER(WHERE active) active,count(*) FILTER(WHERE active AND assigned_to=p_actor) mine,
  count(*) FILTER(WHERE active AND assigned_to IS NULL) unassigned,count(*) FILTER(WHERE 'reassignment'=ANY(tags)) reassignment,
  count(*) FILTER(WHERE active AND due_at<now()) overdue,count(*) FILTER(WHERE active AND due_at>=now() AND due_at<now()+interval '3 days') soon FROM eligible
 )
 SELECT jsonb_build_object('role',v_role,'as_of',now(),'metrics',(SELECT to_jsonb(m) FROM metrics m),
 'counts',coalesce((SELECT jsonb_object_agg(tag,n) FROM(SELECT unnest(tags) tag,count(*) n FROM eligible GROUP BY tag)c),'{}'),
 'service',(SELECT jsonb_build_object('owner',CASE WHEN public.b2b_ops_eligible_staff(s.owner_id) THEN p.name ELSE '' END,
 'response_minutes',s.response_minutes,'inquiries_paused',s.inquiries_paused,'orders_paused',s.orders_paused,'pi_paused',s.pi_paused)
 FROM public.b2b_service_controls s LEFT JOIN public.user_profiles p ON p.id=s.owner_id WHERE s.id)) INTO result;
 IF result->'service' IS NULL OR result->'service'='null'::jsonb THEN RAISE EXCEPTION 'missing service state' USING ERRCODE='55000';END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.b2b_ops_eligible_staff(uuid,text),public.b2b_initial_operations(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.b2b_ops_eligible_staff(uuid,text),public.b2b_initial_operations(uuid) TO service_role;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261004220000_b2b_initial_operations');
COMMIT;
