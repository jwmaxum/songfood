-- B2B-06: server-owned domestic bank-transfer orders. No legacy stock is reserved.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.b2b_order_number_seq;
REVOKE ALL ON SEQUENCE public.b2b_order_number_seq FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.b2b_order_settings(
 id boolean PRIMARY KEY DEFAULT true CHECK(id),revision integer NOT NULL DEFAULT 1,data jsonb NOT NULL,
 updated_by uuid NOT NULL REFERENCES auth.users(id),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.b2b_orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),number text NOT NULL UNIQUE,
 submitted_by uuid NOT NULL REFERENCES public.customer_accounts(id),company_id uuid REFERENCES public.companies(id),
 request_key uuid NOT NULL,request_hash text NOT NULL CHECK(length(request_hash)=64),
 revision integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'requested' CHECK(status IN('requested','reviewed','confirmed','completed','cancelled')),
 customer jsonb NOT NULL,delivery jsonb NOT NULL,evidence_request jsonb NOT NULL,
 net_minor bigint NOT NULL CHECK(net_minor>=0),tax_minor bigint NOT NULL CHECK(tax_minor>=0),
 goods_total_minor bigint NOT NULL CHECK(goods_total_minor=net_minor+tax_minor AND goods_total_minor BETWEEN 1 AND 9000000000000),
 shipping_net_minor bigint CHECK(shipping_net_minor>=0),shipping_tax_minor bigint CHECK(shipping_tax_minor>=0),
 total_minor bigint CHECK(total_minor BETWEEN 1 AND 9000000000000 AND total_minor=goods_total_minor+shipping_net_minor+shipping_tax_minor),
 paid_minor bigint NOT NULL DEFAULT 0 CHECK(paid_minor>=0),refunded_minor bigint NOT NULL DEFAULT 0 CHECK(refunded_minor BETWEEN 0 AND paid_minor),
 credit_minor bigint NOT NULL DEFAULT 0 CHECK(credit_minor BETWEEN 0 AND coalesce(total_minor,goods_total_minor)),
 claim_status text NOT NULL DEFAULT 'none' CHECK(claim_status IN('none','open','resolved')),
 review jsonb,accepted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(submitted_by,request_key)
);
CREATE INDEX IF NOT EXISTS b2b_orders_customer ON public.b2b_orders(submitted_by,created_at DESC);
CREATE INDEX IF NOT EXISTS b2b_orders_company ON public.b2b_orders(company_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.b2b_order_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.b2b_orders(id),
 position integer NOT NULL,snapshot jsonb NOT NULL,
 shipped_quantity integer NOT NULL DEFAULT 0 CHECK(shipped_quantity>=0),
 cancelled_quantity integer NOT NULL DEFAULT 0 CHECK(cancelled_quantity>=0),
 CHECK(shipped_quantity+cancelled_quantity<=(snapshot->>'quantity')::integer),
 UNIQUE(order_id,position),UNIQUE(order_id,id)
);
CREATE TABLE IF NOT EXISTS public.b2b_order_payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.b2b_orders(id),
 kind text NOT NULL CHECK(kind IN('deposit','refund')),amount_minor bigint NOT NULL CHECK(amount_minor>0),
 reference text NOT NULL CHECK(length(reference) BETWEEN 3 AND 150),evidence text NOT NULL CHECK(length(evidence) BETWEEN 3 AND 2000),
 occurred_at timestamptz NOT NULL,actor_id uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,reference)
);
CREATE TABLE IF NOT EXISTS public.b2b_order_shipments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.b2b_orders(id),
 carrier text NOT NULL CHECK(carrier IN('cj','lotte','hanjin','post','direct')),tracking text NOT NULL CHECK(length(tracking) BETWEEN 3 AND 100),
 temperature text NOT NULL,note text NOT NULL,actor_id uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(carrier,tracking),UNIQUE(order_id,id)
);
CREATE TABLE IF NOT EXISTS public.b2b_order_shipment_items(
 shipment_id uuid NOT NULL,order_id uuid NOT NULL,item_id uuid NOT NULL,quantity integer NOT NULL CHECK(quantity>0),
 PRIMARY KEY(shipment_id,item_id),FOREIGN KEY(order_id,shipment_id) REFERENCES public.b2b_order_shipments(order_id,id),
 FOREIGN KEY(order_id,item_id) REFERENCES public.b2b_order_items(order_id,id)
);
CREATE TABLE IF NOT EXISTS public.b2b_order_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid REFERENCES public.b2b_orders(id),
 actor_id uuid NOT NULL REFERENCES auth.users(id),action text NOT NULL,message text NOT NULL,details jsonb NOT NULL DEFAULT '{}',
 request_key uuid,request_hash text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id,actor_id,request_key)
);
CREATE OR REPLACE FUNCTION public.b2b_order_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'order history is immutable'; END IF;
 IF TG_TABLE_NAME='b2b_order_items' AND (to_jsonb(NEW)-ARRAY['shipped_quantity','cancelled_quantity'])=(to_jsonb(OLD)-ARRAY['shipped_quantity','cancelled_quantity']) THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='b2b_orders' AND (to_jsonb(NEW)-ARRAY['revision','status','shipping_net_minor','shipping_tax_minor','total_minor','paid_minor','refunded_minor','credit_minor','claim_status','review','accepted_at','updated_at'])=
 (to_jsonb(OLD)-ARRAY['revision','status','shipping_net_minor','shipping_tax_minor','total_minor','paid_minor','refunded_minor','credit_minor','claim_status','review','accepted_at','updated_at']) THEN
 IF OLD.accepted_at IS NOT NULL AND (NEW.shipping_net_minor,NEW.shipping_tax_minor,NEW.total_minor,NEW.review,NEW.accepted_at) IS DISTINCT FROM
 (OLD.shipping_net_minor,OLD.shipping_tax_minor,OLD.total_minor,OLD.review,OLD.accepted_at) THEN RAISE EXCEPTION 'accepted terms are immutable';END IF;
 RETURN NEW;END IF;
 RAISE EXCEPTION 'order history is immutable';
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_order_settings','b2b_orders','b2b_order_items','b2b_order_payments','b2b_order_shipments','b2b_order_shipment_items','b2b_order_events'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 IF t<>'b2b_order_settings' THEN
 EXECUTE format('DROP TRIGGER IF EXISTS b2b_order_guard ON public.%I',t);
 EXECUTE format('CREATE TRIGGER b2b_order_guard BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.b2b_order_guard()',t);
 END IF;
 END LOOP;
END $$;
-- All mutating paths lock identity tables before order rows. Roles/membership cannot change mid-transaction.
CREATE OR REPLACE FUNCTION public.b2b_order_lock_identity() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN LOCK TABLE public.user_profiles,public.customer_accounts,public.companies,public.company_members IN SHARE MODE;END $$;
CREATE OR REPLACE FUNCTION public.b2b_order_actor(p_actor uuid,p_staff boolean) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN p_staff THEN EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role IN('admin','order_staff'))
 ELSE EXISTS(SELECT 1 FROM public.customer_accounts WHERE id=p_actor AND status='active') END
$$;
CREATE OR REPLACE FUNCTION public.b2b_order_access(p_order public.b2b_orders,p_actor uuid,p_staff boolean) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.b2b_order_actor(p_actor,p_staff) AND (p_staff OR
 (p_order.company_id IS NULL AND p_order.submitted_by=p_actor) OR
 (p_order.company_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.company_members m JOIN public.companies c ON c.id=m.company_id
 WHERE m.user_id=p_actor AND m.company_id=p_order.company_id AND m.status='active' AND c.status='approved')))
$$;
CREATE OR REPLACE FUNCTION public.b2b_order_replay(p_actor uuid,p_key uuid,p_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.b2b_orders;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 SELECT * INTO o FROM public.b2b_orders WHERE submitted_by=p_actor AND request_key=p_key;
 IF NOT FOUND THEN RETURN NULL;END IF;
 IF NOT public.b2b_order_access(o,p_actor,false) THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002';END IF;
 IF o.request_hash IS DISTINCT FROM p_hash THEN RAISE EXCEPTION 'key mismatch' USING ERRCODE='23505';END IF;
 RETURN o.id;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_order_submit(p_actor uuid,p_company uuid,p_key uuid,p_hash text,p_delivery jsonb,p_evidence jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE replay uuid;o public.b2b_orders;current_company uuid;l jsonb;price_id uuid;r public.b2b_price_revisions;
 net bigint:=0;tax bigint:=0;position integer:=0;customer_scope text;customer jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text||':order:'||p_key::text,0));
 replay:=public.b2b_order_replay(p_actor,p_key,p_hash);IF replay IS NOT NULL THEN RETURN replay;END IF;
 IF NOT public.b2b_order_actor(p_actor,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 SELECT m.company_id INTO current_company FROM public.company_members m JOIN public.companies c ON c.id=m.company_id
 WHERE m.user_id=p_actor AND m.status='active' AND c.status='approved';
 IF current_company IS DISTINCT FROM p_company THEN RAISE EXCEPTION 'membership changed' USING ERRCODE='40001';END IF;
 customer_scope:=CASE WHEN current_company IS NULL THEN 'personal' ELSE 'business' END;
 IF p_key IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR coalesce(jsonb_typeof(p_lines),'')<>'array'
 OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 OR coalesce(length(p_delivery->>'recipient'),0)<1
 OR coalesce(p_delivery->>'postal_code','')!~'^[0-9]{5}$' OR coalesce(length(p_delivery->>'address'),0)<1
 THEN RAISE EXCEPTION 'invalid input' USING ERRCODE='22023';END IF;
 -- Protect against insertion of a newer/higher-priority price between application calculation and commit.
 LOCK TABLE public.b2b_price_lists,public.b2b_price_revisions IN SHARE MODE;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  SELECT pr.id INTO price_id FROM public.b2b_price_revisions pr JOIN public.b2b_price_lists pl ON pl.id=pr.price_list_id
   WHERE pl.active AND (pl.scope='common' OR pl.scope=customer_scope OR (pl.scope='company' AND pl.company_id=current_company))
   AND pr.product_id=l->>'product_id' AND pr.status='approved' AND pr.valid_from<=now()
   ORDER BY CASE pl.scope WHEN 'company' THEN 3 WHEN 'common' THEN 1 ELSE 2 END DESC,pr.version DESC LIMIT 1;
  IF price_id IS NULL OR price_id IS DISTINCT FROM (l->>'price_version_id')::uuid THEN RAISE EXCEPTION 'price changed' USING ERRCODE='40001';END IF;
  SELECT * INTO r FROM public.b2b_price_revisions WHERE id=price_id;
  IF r.valid_until<=now() OR r.valid_until IS NULL THEN RAISE EXCEPTION 'price expired' USING ERRCODE='40001';END IF;
  IF coalesce(l->>'currency','')<>'KRW' OR coalesce(l->>'unit','') NOT IN('EA','BOX','CTN')
   OR coalesce((l->>'quantity')::integer,0) NOT BETWEEN 1 AND 100000
   OR (l->>'net_minor')::bigint<>(l->>'unit_net_minor')::bigint*(l->>'quantity')::integer
   OR (l->>'tax_minor')::bigint<>(l->>'unit_tax_minor')::bigint*(l->>'quantity')::integer
   OR (l->>'total_minor')::bigint<>(l->>'net_minor')::bigint+(l->>'tax_minor')::bigint
   THEN RAISE EXCEPTION 'invalid line' USING ERRCODE='22023';END IF;
  net:=net+(l->>'net_minor')::bigint;tax:=tax+(l->>'tax_minor')::bigint;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) v GROUP BY v->>'product_id',v->>'unit' HAVING count(*)>1)
 THEN RAISE EXCEPTION 'duplicate line' USING ERRCODE='22023';END IF;
 SELECT jsonb_build_object('name',a.name,'email',a.email,'company',coalesce(c.name,'')) INTO customer
 FROM public.customer_accounts a LEFT JOIN public.companies c ON c.id=current_company WHERE a.id=p_actor;
 INSERT INTO public.b2b_orders(number,submitted_by,company_id,request_key,request_hash,customer,delivery,evidence_request,net_minor,tax_minor,goods_total_minor)
 VALUES('SF-'||to_char(now() AT TIME ZONE 'Asia/Seoul','YYYYMMDD')||'-'||lpad(nextval('public.b2b_order_number_seq')::text,7,'0'),
 p_actor,current_company,p_key,p_hash,customer,p_delivery,p_evidence,net,tax,net+tax) RETURNING * INTO o;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  INSERT INTO public.b2b_order_items(order_id,position,snapshot) VALUES(o.id,position,l);position:=position+1;
 END LOOP;
 INSERT INTO public.b2b_order_events(order_id,actor_id,action,message) VALUES(o.id,p_actor,'submit','주문이 접수되었습니다. 공급 가능 여부와 배송비를 확인합니다.');
 RETURN o.id;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_order_settings_save(p_actor uuid,p_expected integer,p_data jsonb) RETURNS public.b2b_order_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.b2b_order_settings;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_actor AND status='active' AND role='admin') THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF coalesce(length(p_data->>'bank'),0) NOT BETWEEN 1 AND 100 OR coalesce(length(p_data->>'account'),0) NOT BETWEEN 1 AND 100
 OR coalesce(length(p_data->>'holder'),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'bank missing' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('b2b_order_settings',0));
 SELECT * INTO r FROM public.b2b_order_settings WHERE id=true;
 IF coalesce(r.revision,0) IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'stale settings' USING ERRCODE='40001';END IF;
 INSERT INTO public.b2b_order_settings(id,data,updated_by) VALUES(true,p_data,p_actor)
 ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,revision=b2b_order_settings.revision+1,updated_by=p_actor,updated_at=now() RETURNING * INTO r;
 INSERT INTO public.b2b_order_events(actor_id,action,message,details) VALUES(p_actor,'settings','국내 입금계좌 설정 변경',jsonb_build_object('revision',r.revision));
 RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_order_action(p_actor uuid,p_id uuid,p_staff boolean,p_expected integer,p_key uuid,p_hash text,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.b2b_orders;ev public.b2b_order_events;i public.b2b_order_items;l jsonb;s uuid;bank jsonb;
 amount bigint;adjustment bigint;remaining bigint;message text;eligible boolean;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 SELECT * INTO o FROM public.b2b_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT public.b2b_order_access(o,p_actor,p_staff) THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002';END IF;
 SELECT * INTO ev FROM public.b2b_order_events WHERE order_id=p_id AND actor_id=p_actor AND request_key=p_key;
 IF FOUND THEN IF ev.request_hash IS DISTINCT FROM p_hash THEN RAISE EXCEPTION 'key mismatch' USING ERRCODE='23505';END IF;RETURN p_id;END IF;
 IF p_expected IS DISTINCT FROM o.revision THEN RAISE EXCEPTION 'stale order' USING ERRCODE='40001';END IF;
 IF p_key IS NULL OR p_hash IS NULL OR length(p_hash)<>64 THEN RAISE EXCEPTION 'invalid key' USING ERRCODE='22023';END IF;
 eligible:=CASE WHEN p_staff THEN p_action IN('review','deposit','ship','cancel','cancel_remaining','credit','refund','resolve_claim','evidence')
 ELSE p_action IN('accept','cancel','claim','deposit_report') END;
 IF eligible IS DISTINCT FROM true THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 message:=coalesce(p_data->>'message',p_data->>'note','');
 CASE p_action
 WHEN 'review' THEN
  IF o.status NOT IN('requested','reviewed') OR (p_data->>'supply_confirmed')::boolean IS DISTINCT FROM true
   OR EXISTS(SELECT 1 FROM public.b2b_order_items oi JOIN public.b2b_price_revisions pr ON pr.id=(oi.snapshot->>'price_version_id')::uuid WHERE oi.order_id=p_id AND pr.valid_until<=now())
   OR coalesce((p_data->>'shipping_net_minor')::bigint,-1)<0 OR coalesce(p_data->>'shipping_tax_code','') NOT IN('vat10','exempt')
   OR (p_data->>'shipping_tax_minor')::bigint IS DISTINCT FROM (CASE WHEN p_data->>'shipping_tax_code'='vat10' THEN ((p_data->>'shipping_net_minor')::bigint+5)/10 ELSE 0 END)
   OR coalesce((p_data->>'ship_date')::date,'1900-01-01')<(now() AT TIME ZONE 'Asia/Seoul')::date
   OR coalesce(p_data->>'temperature','') NOT IN('product_standard','ambient','chilled','frozen')
   OR length(message)<3 THEN RAISE EXCEPTION 'review prerequisites' USING ERRCODE='22023';END IF;
  SELECT data INTO bank FROM public.b2b_order_settings WHERE id=true;
  IF bank IS NULL THEN RAISE EXCEPTION 'bank missing' USING ERRCODE='22023';END IF;
  UPDATE public.b2b_orders SET status='reviewed',shipping_net_minor=(p_data->>'shipping_net_minor')::bigint,shipping_tax_minor=(p_data->>'shipping_tax_minor')::bigint,
   total_minor=goods_total_minor+(p_data->>'shipping_net_minor')::bigint+(p_data->>'shipping_tax_minor')::bigint,
   review=jsonb_build_object('shipping_tax_code',p_data->>'shipping_tax_code','note',message,'ship_date',p_data->>'ship_date','temperature',p_data->>'temperature','bank',bank) WHERE id=p_id;
 WHEN 'accept' THEN
  IF o.status<>'reviewed' OR o.claim_status='open' THEN RAISE EXCEPTION 'not ready' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM public.b2b_order_items oi JOIN public.b2b_price_revisions pr ON pr.id=(oi.snapshot->>'price_version_id')::uuid WHERE oi.order_id=p_id AND pr.valid_until<=now())
   THEN RAISE EXCEPTION 'price expired' USING ERRCODE='40001';END IF;
  UPDATE public.b2b_orders SET status='confirmed',accepted_at=now() WHERE id=p_id;
  message:='고객이 배송비를 포함한 최종 주문금액과 조건을 확인했습니다.';
 WHEN 'deposit' THEN
  amount:=(p_data->>'amount_minor')::bigint;
  IF o.status<>'confirmed' OR coalesce(amount,0)<=0 OR amount>o.total_minor-o.credit_minor-o.paid_minor+o.refunded_minor OR o.claim_status='open'
  THEN RAISE EXCEPTION 'invalid deposit' USING ERRCODE='22023';END IF;
  INSERT INTO public.b2b_order_payments(order_id,kind,amount_minor,reference,evidence,occurred_at,actor_id)
   VALUES(p_id,'deposit',amount,lower(trim(p_data->>'reference')),p_data->>'evidence',(p_data->>'occurred_at')::timestamptz,p_actor);
  UPDATE public.b2b_orders SET paid_minor=paid_minor+amount WHERE id=p_id;message:='담당자가 은행 입금을 확인했습니다.';
 WHEN 'refund' THEN
  amount:=(p_data->>'amount_minor')::bigint;
  IF coalesce(amount,0)<=0 OR amount>o.paid_minor-o.refunded_minor-(coalesce(o.total_minor,o.goods_total_minor)-o.credit_minor)
  THEN RAISE EXCEPTION 'invalid refund' USING ERRCODE='22023';END IF;
  INSERT INTO public.b2b_order_payments(order_id,kind,amount_minor,reference,evidence,occurred_at,actor_id)
   VALUES(p_id,'refund',amount,lower(trim(p_data->>'reference')),p_data->>'evidence',(p_data->>'occurred_at')::timestamptz,p_actor);
  UPDATE public.b2b_orders SET refunded_minor=refunded_minor+amount WHERE id=p_id;message:='담당자가 환불 송금을 확인했습니다.';
 WHEN 'ship' THEN
  IF o.status<>'confirmed' OR o.accepted_at IS NULL OR o.claim_status='open' OR o.paid_minor-o.refunded_minor<>o.total_minor-o.credit_minor
   OR coalesce(jsonb_typeof(p_data->'items'),'')<>'array' OR jsonb_array_length(p_data->'items') NOT BETWEEN 1 AND 100
   OR p_data->>'temperature' IS DISTINCT FROM o.review->>'temperature' OR length(message)<3
  THEN RAISE EXCEPTION 'shipment prerequisites' USING ERRCODE='22023';END IF;
  INSERT INTO public.b2b_order_shipments(order_id,carrier,tracking,temperature,note,actor_id)
   VALUES(p_id,p_data->>'carrier',p_data->>'tracking',p_data->>'temperature',message,p_actor) RETURNING id INTO s;
  FOR l IN SELECT value FROM jsonb_array_elements(p_data->'items') LOOP
   SELECT * INTO i FROM public.b2b_order_items WHERE id=(l->>'item_id')::uuid AND order_id=p_id;
   IF NOT FOUND OR coalesce((l->>'quantity')::integer,0)<1 OR (l->>'quantity')::integer>(i.snapshot->>'quantity')::integer-i.shipped_quantity-i.cancelled_quantity
    THEN RAISE EXCEPTION 'invalid shipped quantity' USING ERRCODE='22023';END IF;
   INSERT INTO public.b2b_order_shipment_items(order_id,shipment_id,item_id,quantity) VALUES(p_id,s,i.id,(l->>'quantity')::integer);
   UPDATE public.b2b_order_items SET shipped_quantity=shipped_quantity+(l->>'quantity')::integer WHERE id=i.id;
  END LOOP;
 WHEN 'cancel' THEN
  IF o.status='cancelled' OR EXISTS(SELECT 1 FROM public.b2b_order_items WHERE order_id=p_id AND shipped_quantity>0)
   OR (NOT p_staff AND (o.status NOT IN('requested','reviewed') OR o.paid_minor>0)) OR length(message)<3
   THEN RAISE EXCEPTION 'cannot cancel' USING ERRCODE='22023';END IF;
  UPDATE public.b2b_order_items SET cancelled_quantity=(snapshot->>'quantity')::integer WHERE order_id=p_id;
  UPDATE public.b2b_orders SET status='cancelled',credit_minor=coalesce(total_minor,goods_total_minor) WHERE id=p_id;
 WHEN 'cancel_remaining' THEN
  IF o.status<>'confirmed' OR o.claim_status<>'open' OR length(message)<3 OR coalesce(length(p_data->>'agreement'),0)<3
   OR NOT EXISTS(SELECT 1 FROM public.b2b_order_items WHERE order_id=p_id AND shipped_quantity>0)
   THEN RAISE EXCEPTION 'cannot cancel remaining' USING ERRCODE='22023';END IF;
  SELECT sum(((snapshot->>'quantity')::integer-shipped_quantity-cancelled_quantity)*(snapshot->>'unit_total_minor')::bigint) INTO adjustment FROM public.b2b_order_items WHERE order_id=p_id;
  IF coalesce(adjustment,0)<=0 OR adjustment>o.total_minor-o.credit_minor THEN RAISE EXCEPTION 'no cancellable balance' USING ERRCODE='22023';END IF;
  UPDATE public.b2b_order_items SET cancelled_quantity=(snapshot->>'quantity')::integer-shipped_quantity WHERE order_id=p_id;
  UPDATE public.b2b_orders SET credit_minor=credit_minor+adjustment WHERE id=p_id;
 WHEN 'credit' THEN
  amount:=(p_data->>'amount_minor')::bigint;
  IF o.claim_status<>'open' OR o.status NOT IN('confirmed','completed') OR coalesce(amount,0)<=0 OR amount>o.total_minor-o.credit_minor
   OR coalesce(length(p_data->>'agreement'),0)<3 OR length(message)<3
   OR EXISTS(SELECT 1 FROM public.b2b_order_items WHERE order_id=p_id AND shipped_quantity+cancelled_quantity<(snapshot->>'quantity')::integer)
   THEN RAISE EXCEPTION 'invalid agreed credit' USING ERRCODE='22023';END IF;
  UPDATE public.b2b_orders SET credit_minor=credit_minor+amount WHERE id=p_id;
 WHEN 'claim' THEN
  IF o.status NOT IN('confirmed','completed','cancelled') OR o.claim_status='open' OR length(message)<3
   THEN RAISE EXCEPTION 'invalid claim' USING ERRCODE='22023';END IF;
  UPDATE public.b2b_orders SET claim_status='open' WHERE id=p_id;
 WHEN 'resolve_claim' THEN
  IF o.claim_status<>'open' OR length(message)<3 OR o.paid_minor-o.refunded_minor>coalesce(o.total_minor,o.goods_total_minor)-o.credit_minor
   THEN RAISE EXCEPTION 'unresolved refund' USING ERRCODE='22023';END IF;
  UPDATE public.b2b_orders SET claim_status='resolved' WHERE id=p_id;
 WHEN 'deposit_report' THEN
  IF o.status<>'confirmed' OR length(message)<3 THEN RAISE EXCEPTION 'not awaiting deposit' USING ERRCODE='22023';END IF;
  message:='입금 확인 요청: '||message;
 WHEN 'evidence' THEN
  IF length(message)<3 THEN RAISE EXCEPTION 'evidence note required' USING ERRCODE='22023';END IF;
 ELSE RAISE EXCEPTION 'invalid action' USING ERRCODE='22023';
 END CASE;
 IF p_action IN('deposit','refund') AND (p_data->>'occurred_at')::timestamptz>now()+interval '1 minute' THEN RAISE EXCEPTION 'future payment' USING ERRCODE='22023';END IF;
 UPDATE public.b2b_orders SET revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO o;
 SELECT sum((snapshot->>'quantity')::integer-shipped_quantity-cancelled_quantity) INTO remaining FROM public.b2b_order_items WHERE order_id=p_id;
 IF o.status IN('confirmed','completed') THEN
  UPDATE public.b2b_orders SET status=CASE WHEN remaining=0 AND o.claim_status<>'open' AND o.paid_minor-o.refunded_minor=o.total_minor-o.credit_minor THEN 'completed' ELSE 'confirmed' END WHERE id=p_id;
 END IF;
 INSERT INTO public.b2b_order_events(order_id,actor_id,action,message,details,request_key,request_hash)
 VALUES(p_id,p_actor,p_action,message,p_data,p_key,p_hash);
 RETURN p_id;
END $$;
CREATE OR REPLACE FUNCTION public.b2b_order_detail(p_actor uuid,p_id uuid,p_staff boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.b2b_orders;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 SELECT * INTO o FROM public.b2b_orders WHERE id=p_id FOR SHARE;
 IF NOT FOUND OR NOT public.b2b_order_access(o,p_actor,p_staff) THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002';END IF;
 RETURN jsonb_build_object('order',to_jsonb(o)-ARRAY['request_key','request_hash'],
 'items',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position) FROM public.b2b_order_items i WHERE i.order_id=p_id),'[]'),
 'payments',coalesce((SELECT jsonb_agg(CASE WHEN p_staff THEN to_jsonb(p) ELSE to_jsonb(p)-ARRAY['reference','evidence','actor_id'] END ORDER BY p.created_at,p.id) FROM public.b2b_order_payments p WHERE p.order_id=p_id),'[]'),
 'shipments',coalesce((SELECT jsonb_agg((to_jsonb(s)-'actor_id')||jsonb_build_object('items',(SELECT jsonb_agg(jsonb_build_object('item_id',si.item_id,'quantity',si.quantity)) FROM public.b2b_order_shipment_items si WHERE si.shipment_id=s.id)) ORDER BY s.created_at,s.id) FROM public.b2b_order_shipments s WHERE s.order_id=p_id),'[]'),
 'events',coalesce((SELECT jsonb_agg(CASE WHEN p_staff THEN to_jsonb(e)-ARRAY['request_key','request_hash'] ELSE jsonb_build_object('id',e.id,'action',e.action,'message',e.message,'created_at',e.created_at) END ORDER BY e.created_at,e.id) FROM public.b2b_order_events e WHERE e.order_id=p_id),'[]'));
END $$;
CREATE OR REPLACE FUNCTION public.b2b_order_list(p_actor uuid,p_staff boolean,p_page integer DEFAULT 1,p_status text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM public.b2b_order_lock_identity();
 IF NOT public.b2b_order_actor(p_actor,p_staff) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 IF p_page NOT BETWEEN 1 AND 100000 OR p_status NOT IN('','requested','reviewed','confirmed','completed','cancelled')
 THEN RAISE EXCEPTION 'invalid filter' USING ERRCODE='22023';END IF;
 SELECT jsonb_build_object('orders',coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC,q.id),'[]')) INTO result FROM(
 SELECT id,number,revision,status,customer,goods_total_minor,total_minor,paid_minor,refunded_minor,credit_minor,claim_status,created_at
 FROM public.b2b_orders o WHERE public.b2b_order_access(o,p_actor,p_staff) AND (p_status='' OR status=p_status)
 ORDER BY created_at DESC,id OFFSET (p_page-1)*30 LIMIT 30) q;
 RETURN result||jsonb_build_object('page',p_page,'total',(SELECT count(*) FROM public.b2b_orders o WHERE public.b2b_order_access(o,p_actor,p_staff) AND (p_status='' OR status=p_status)));
END $$;
DO $$ DECLARE sig text; BEGIN
 FOR sig IN SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'b2b_order_%' LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION '||sig||' FROM PUBLIC,anon,authenticated';
 EXECUTE 'GRANT EXECUTE ON FUNCTION '||sig||' TO service_role';
 END LOOP;
END $$;
INSERT INTO public.b2b_schema_versions(id) VALUES('20261003190000_b2b_orders') ON CONFLICT DO NOTHING;
COMMIT;
