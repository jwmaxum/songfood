'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {useCart} from '@/context/CartContext';
import {orderGet,orderPost} from '@/lib/orders/client';
import type {Order,OrderDetail} from '@/lib/orders/types';
import {ORDER_LABELS,TEMPERATURES,CARRIERS,payable,refundDue,fulfillment,trackingUrl} from '@/lib/orders/types';
import {formatMoney} from '@/lib/pricing/types';
import OrderActions from './OrderActions';
import BankSettings from './BankSettings';
const money=(n:number)=>formatMoney(n,'KRW');
const time=(s:string)=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
export default function OrderWorkspace({staff=false,initialId}:{staff?:boolean;initialId?:string}){
 const auth=useAuth();
 if(!staff&&auth.loading)return <p role="status">회원 정보를 확인하고 있습니다…</p>;
 if(!staff&&!auth.user)return <section><h1 className="text-3xl font-bold">내 주문</h1><p className="mt-4">로그인 후 개인·회사 주문을 확인할 수 있습니다.</p><Link href="/account/login" className="mt-5 block underline">로그인 / 회원가입</Link></section>;
 const key=staff?'staff':[auth.user?.id,auth.company?.id,auth.company?.status,auth.membership?.status].join(':');
 return <Workspace key={key} staff={staff} initialId={initialId}/>;
}
function Workspace({staff,initialId}:{staff:boolean;initialId?:string}){
 const base=staff?'/api/admin/orders':'/api/orders',cart=useCart();
 const [orders,setOrders]=useState<Order[]>([]),[detail,setDetail]=useState<OrderDetail|null>(null),[selected,setSelected]=useState(initialId||''),
 [page,setPage]=useState(1),[total,setTotal]=useState(0),[filter,setFilter]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const loadList=useCallback(async()=>{const d=await orderGet(base+'?page='+page+'&status='+filter);setOrders(d.orders);setTotal(d.total);},[base,page,filter]);
 useEffect(()=>{let live=true;orderGet(base+'?page='+page+'&status='+filter).then(d=>{if(live){setOrders(d.orders);setTotal(d.total);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[base,page,filter]);
 useEffect(()=>{if(!selected)return;let live=true;orderGet(base+'/'+selected).then(d=>{if(live)setDetail(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[base,selected]);
 async function refresh(){setBusy(true);setError('');try{await loadList();if(selected)setDetail(await orderGet(base+'/'+selected));}catch(e){setError(e instanceof Error?e.message:'조회 실패');}finally{setBusy(false);}}
 async function act(body:Record<string,unknown>){
  if(!detail||busy)return false;setBusy(true);setMessage('');setError('');
  try{const d=await orderPost(base+'/'+detail.order.id,{...body,revision:detail.order.revision});setDetail(d);setMessage('처리 내용을 저장했습니다.');await loadList();return true;}
  catch(e){setError(e instanceof Error?e.message:'처리 실패');return false;}finally{setBusy(false);}
 }
 async function reorder(){
  if(!detail||busy)return;setBusy(true);setError('');setMessage('');
  try{const d=await orderGet('/api/orders/'+detail.order.id+'/reorder');cart.addOrderItems(d.items);setMessage(d.message+' 현재 상품 합계 '+money(d.preview.total_minor));}
  catch(e){setError(e instanceof Error?e.message:'재주문 상품을 확인하지 못했습니다.');}finally{setBusy(false);}
 }
 return <div className="space-y-6 text-stone-900"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-green-800">{staff?'ORDER OPERATIONS':'MY ORDERS'}</p><h1 className="mt-2 text-3xl font-bold">{staff?'국내 주문·입금·출고':'내 주문'}</h1></div><button onClick={()=>void refresh()} disabled={busy} className="rounded border px-4 py-2 disabled:opacity-40">최신 내용 불러오기</button></header>
 <p className="text-stone-600">주문 접수 → 공급·배송비 확인 → 고객 최종 확인 → 계좌입금 확인 → 출고. 카드 결제는 제공하지 않습니다.</p>
 {staff&&<><Link className="block underline" href="/admin?kind=order">담당자·기한·미입금·출고·환불 통합 검색</Link><BankSettings/></>}
 {error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
 {message&&<p role="status" className="rounded bg-green-50 p-4">{message} {!staff&&<Link href="/cart" className="ml-3 underline">구매함 확인</Link>}</p>}
 <section className="rounded-xl border p-4"><div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-lg font-bold">주문 목록 ({total})</h2><label>상태 <select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}} className="rounded border p-2"><option value="">전체</option>{Object.entries(ORDER_LABELS).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label></div>
 <div className="mt-4 grid gap-3 md:grid-cols-2">{orders.map(o=><button key={o.id} onClick={()=>{setSelected(o.id);setDetail(null);setError('');setMessage('');}} className={'rounded-lg border p-4 text-left '+(selected===o.id?'border-green-800 bg-green-50':'bg-white')}>
 <span className="font-bold">{o.number}</span><span className="mt-2 block text-sm">{ORDER_LABELS[o.status]} {o.claim_status==='open'?'· 클레임 확인 필요':''}</span><span className="mt-2 block">{o.total_minor===null?'상품 '+money(o.goods_total_minor)+' · 배송비 미확정':money(payable(o))}</span><span className="mt-2 block text-xs text-stone-500">{time(o.created_at)}{staff?' · '+o.customer.name+' '+o.customer.company:''}</span></button>)}</div>
 {!orders.length&&<p className="py-6 text-stone-600">표시할 주문이 없습니다. {!staff&&<Link href="/shop" className="underline">상품 둘러보기</Link>}</p>}
 <div className="mt-4 flex items-center gap-4"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="rounded border px-3 py-2 disabled:opacity-30">이전</button><span>{page} / {Math.max(1,Math.ceil(total/30))}</span><button disabled={page*30>=total} onClick={()=>setPage(p=>p+1)} className="rounded border px-3 py-2 disabled:opacity-30">다음</button></div></section>
 {selected&&!detail&&!error&&<p role="status">주문 상세를 불러오고 있습니다…</p>}
 {detail&&<><Details detail={detail} staff={staff}/>
 {!staff&&<div className="flex flex-wrap gap-4"><button disabled={busy} onClick={()=>void reorder()} className="rounded border border-green-800 px-5 py-3 text-green-900 disabled:opacity-40">현재 가격으로 구매함에 다시 담기</button><Link href="/cart" className="rounded border px-5 py-3">구매함 보기</Link><Link href={'/account/orders/'+detail.order.id} className="px-5 py-3 underline">이 주문 바로가기</Link></div>}
 <OrderActions key={detail.order.id+':'+detail.order.revision} detail={detail} staff={staff} busy={busy} act={act}/></>}
 </div>;
}
export function Details({detail,staff}:{detail:OrderDetail;staff:boolean}){
 const {order:o,items,payments,shipments,events}=detail;
 return <article className="space-y-6 rounded-xl border bg-white p-5 sm:p-7">
 <header><h2 className="break-all text-2xl font-bold">{o.number}</h2>{staff&&<div className="mt-3 flex gap-4 text-sm"><Link className="underline" href={'/admin?kind=order&q='+o.id}>담당자·기한·인수인계 관리</Link><Link className="underline" href={'/admin/history/order/'+o.id}>전체 업무 이력</Link></div>}<p className="mt-3 font-semibold">{ORDER_LABELS[o.status]} · {fulfillment(items)}</p><p className="mt-2 text-sm">{time(o.created_at)} · 처리 버전 {o.revision} · {o.claim_status==='open'?'클레임 확인 중':o.claim_status==='resolved'?'클레임 해결 기록 있음':'클레임 없음'}</p></header>
 <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-lg bg-stone-50 p-4"><h3 className="font-bold">배송지·요청</h3><p className="mt-3">{o.delivery.recipient} · {o.delivery.phone}</p><p className="mt-2">({o.delivery.postal_code}) {o.delivery.address} {o.delivery.address_detail}</p><p className="mt-2">희망일: {o.delivery.desired_date||'별도 협의'}</p><p className="mt-2">요청 온도: {TEMPERATURES[o.delivery.temperature]}</p><p className="mt-2 whitespace-pre-wrap">{o.delivery.note}</p></section>
 <section className="rounded-lg bg-green-50 p-4"><h3 className="font-bold">금액·입금 상태</h3><p className="mt-3">상품 공급가액 {money(o.net_minor)} + VAT {money(o.tax_minor)}</p><p className="mt-2">상품 합계 {money(o.goods_total_minor)}</p><p className="mt-2">{o.shipping_net_minor===null?'배송비 미확정':'배송 공급가액 '+money(o.shipping_net_minor)+' + VAT '+money(o.shipping_tax_minor||0)}</p>
 <p className="mt-3 text-lg font-bold">{o.total_minor===null?'최종 금액 확인 대기':'최초 확정 대상 '+money(o.total_minor)}</p>
 {o.credit_minor>0&&<p className="mt-2">취소·합의 감액 {money(o.credit_minor)} · 현재 거래금액 {money(payable(o))}</p>}
 <p className="mt-3">확인 입금 {money(o.paid_minor)} · 환불 완료 {money(o.refunded_minor)}</p><p className="mt-2">{o.total_minor===null?'아직 입금하지 마세요.':refundDue(o)>0?'환불 대기 '+money(refundDue(o)):o.paid_minor-o.refunded_minor<payable(o)?'입금 잔액 '+money(payable(o)-o.paid_minor+o.refunded_minor):'입금 잔액 없음'}</p></section></div>
 <section><h3 className="text-lg font-bold">접수 시 상품·포장·VAT 내역</h3>{!o.accepted_at&&o.status!=='cancelled'&&<p className="mt-2 text-sm text-stone-600">표시된 가격 유효기간 안에 최종 조건을 확인해 주세요. 만료 시 현재 가격으로 다시 주문합니다.</p>}<div className="mt-3 space-y-3">{items.map(i=><div key={i.id} className="rounded border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{i.snapshot.name}</strong><span>{money(i.snapshot.total_minor)}</span></div><p className="mt-2 text-sm">{i.snapshot.sku} · {i.snapshot.quantity} {i.snapshot.unit} · 1 {i.snapshot.unit} = {i.snapshot.ea_per_unit} EA · 단가 {money(i.snapshot.unit_total_minor)}</p><p className="mt-2 text-sm">공급가액 {money(i.snapshot.net_minor)} + VAT {money(i.snapshot.tax_minor)} ({i.snapshot.tax_code==='exempt'?'면세':'과세'}) · 가격 버전 {i.snapshot.price_version} · 유효기간 {time(i.snapshot.valid_until)}</p><p className="mt-2 text-sm">보관: {i.snapshot.storage||'담당자 확인'} · 출고 {i.shipped_quantity} / 취소 {i.cancelled_quantity} / 남은 수량 {i.snapshot.quantity-i.shipped_quantity-i.cancelled_quantity} {i.snapshot.unit}</p></div>)}</div></section>
 {o.review&&<section className="rounded-lg border border-green-200 p-4"><h3 className="font-bold">공급·배송 조건</h3><p className="mt-3">출고 예정일 {o.review.ship_date} · {TEMPERATURES[o.review.temperature as keyof typeof TEMPERATURES]}</p><p className="mt-2 whitespace-pre-wrap">{o.review.note}</p>
 {o.accepted_at&&o.status!=='cancelled'?<><p className="mt-4 font-semibold">입금계좌: {o.review.bank.bank} {o.review.bank.account} (예금주 {o.review.bank.holder})</p><p className="mt-2">{o.review.bank.notice}</p><p className="mt-2 text-sm">최종 조건 확인: {time(o.accepted_at)}</p></>:<p className="mt-4 font-semibold">{o.status==='cancelled'?'취소된 주문입니다. 입금하지 마세요.':'최종 금액을 확인한 후 입금계좌를 안내합니다.'}</p>}</section>}
 <section><h3 className="font-bold">거래 증빙 요청</h3><p className="mt-2">{o.evidence_request.kind==='none'?'별도 요청 없음':o.evidence_request.kind==='tax_invoice'?'세금계산서 발행 요청':'현금영수증 발행 요청'}</p><p className="mt-2 text-sm">{o.evidence_request.company} {o.evidence_request.registration_no} {o.evidence_request.email}</p><p className="mt-2 text-sm">{o.evidence_request.note}</p><p className="mt-2 text-xs text-stone-500">요청·처리 기록이며 실제 증빙은 담당자가 별도로 발행합니다.</p></section>
 <section><h3 className="font-bold">입금·환불 기록</h3>{payments.length?payments.map(p=><div key={p.id} className="mt-3 rounded border p-3"><p>{p.kind==='deposit'?'입금 확인':'환불 송금'} {money(p.amount_minor)} · {time(p.occurred_at)}</p>{staff&&<p className="mt-2 whitespace-pre-wrap text-sm">참조: {p.reference} · 근거: {p.evidence}</p>}</div>):<p className="mt-2 text-sm">확인된 은행 거래가 없습니다.</p>}</section>
 <section><h3 className="font-bold">출고·배송 조회</h3>{shipments.length?shipments.map(s=><div key={s.id} className="mt-3 rounded border p-4"><p>{CARRIERS[s.carrier as keyof typeof CARRIERS]} · {s.tracking} · {time(s.created_at)}</p>{trackingUrl(s.carrier,s.tracking)&&<a href={trackingUrl(s.carrier,s.tracking)!} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-green-800 underline">운송사 배송 조회</a>}<p className="mt-2">{TEMPERATURES[s.temperature as keyof typeof TEMPERATURES]} · {s.note}</p>{s.items.map(si=>{const i=items.find(i=>i.id===si.item_id);return <p key={si.item_id} className="mt-2 text-sm">{i?.snapshot.name} · {si.quantity} {i?.snapshot.unit}</p>;})}</div>):<p className="mt-2 text-sm">등록된 출고가 없습니다.</p>}</section>
 <section><h3 className="font-bold">주문 진행 기록</h3><ol className="mt-3 space-y-3">{events.map(e=><li key={e.id} className="border-l-2 border-green-200 pl-4"><p className="whitespace-pre-wrap">{e.message}</p><p className="mt-1 text-xs text-stone-500">{time(e.created_at)}</p></li>)}</ol></section>
 </article>;
}
