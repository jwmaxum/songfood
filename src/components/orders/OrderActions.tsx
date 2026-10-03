'use client';
import {useState} from 'react';
import type {OrderDetail} from '@/lib/orders/types';
import {CARRIERS,TEMPERATURES,refundDue} from '@/lib/orders/types';
import {formatMoney} from '@/lib/pricing/types';
export const field='mt-1 w-full rounded border border-stone-300 bg-white p-2 text-stone-900';
const button='rounded bg-green-900 px-4 py-3 text-white disabled:opacity-40';
type Props={detail:OrderDetail;staff:boolean;busy:boolean;act:(body:Record<string,unknown>)=>Promise<boolean>};
function ActionForm({title,action,children,act,busy,transform,blocked=false}:{title:string;action:string;children:React.ReactNode;act:Props['act'];busy:boolean;blocked?:boolean;transform?:(f:Record<string,FormDataEntryValue>)=>Record<string,unknown>}){
 const [localError,setLocalError]=useState('');
 return <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{title}</summary>
 <form className="mt-4" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=Object.fromEntries(new FormData(form));setLocalError('');try{if(await act({action,...(transform?transform(f):f)}))form.reset();}catch(e){setLocalError(e instanceof Error?e.message:'입력값을 확인해 주세요.');}}}>
 <fieldset disabled={busy||blocked} className="space-y-4">{children}<button className={button}>{busy?'처리 중…':title}</button></fieldset>{localError&&<p role="alert">{localError}</p>}</form></details>;
}
const Reason=({label='사유 / 고객 안내 내용'}:{label?:string})=><label className="block">{label}<textarea name="message" minLength={3} maxLength={2000} required className={field}/></label>;
export default function OrderActions({detail,staff,busy,act}:Props){
 const {order:o,items}=detail,remaining=items.filter(i=>i.snapshot.quantity>i.shipped_quantity+i.cancelled_quantity),shipped=items.some(i=>i.shipped_quantity>0);
 const common={act,busy},canShip=o.status==='confirmed'&&o.claim_status!=='open'&&o.paid_minor-o.refunded_minor===o.total_minor!-o.credit_minor;
 return <section className="space-y-3"><h2 className="text-xl font-bold">{staff?'주문 처리':'주문 확인·요청'}</h2>
 {!staff&&o.status==='reviewed'&&<ActionForm {...common} title="최종 금액과 배송 조건 확인" action="accept" transform={()=>({})}><p>아래 확인 후에만 주문이 확정되며 계좌입금할 수 있습니다.</p><label className="flex gap-3"><input type="checkbox" required/><span>배송비 포함 {formatMoney(o.total_minor!,'KRW')}, 출고 예정일 {o.review?.ship_date}, 보관·배송 온도와 안내 내용을 확인했습니다.</span></label></ActionForm>}
 {staff&&['requested','reviewed'].includes(o.status)&&<ActionForm {...common} title="공급·배송 조건 제시" action="review" transform={f=>({...f,supply_confirmed:f.supply_confirmed==='on',shipping_net_minor:Number(f.shipping_net_minor)})}>
 <p className="text-sm text-stone-600">모든 주문 수량의 공급 가능 여부와 상품별 보관온도를 확인하세요. 수량 변경이 필요하면 취소 후 새로 주문합니다. 가격 유효기간이 지나면 현재 가격으로 재주문해야 합니다.</p>
 <label className="flex gap-3"><input type="checkbox" name="supply_confirmed" required/><span>전체 수량 공급 가능 확인 (자동 재고 예약 아님)</span></label>
 <div className="grid gap-4 sm:grid-cols-2"><label>배송 공급가액 (KRW)<input type="number" name="shipping_net_minor" min={0} max={1000000000} step={1} required className={field}/></label><label>배송 과세구분<select name="shipping_tax_code" className={field}><option value="vat10">과세 10% (서버 계산)</option><option value="exempt">면세 (근거를 안내에 기록)</option></select></label>
 <label>출고 예정일<input type="date" name="ship_date" required className={field}/></label><label>확정 배송 온도<select name="temperature" defaultValue={o.delivery.temperature} className={field}>{Object.entries(TEMPERATURES).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label></div>
 <Reason label="공급 확인 근거·배송비 산정·온도 및 고객 안내"/></ActionForm>}
 {staff&&o.status==='confirmed'&&o.claim_status!=='open'&&o.paid_minor-o.refunded_minor<o.total_minor!-o.credit_minor&&<Payment action="deposit" {...common}/>}
 {staff&&refundDue(o)>0&&<><p className="rounded bg-amber-50 p-3">환불 대기 {formatMoney(refundDue(o),'KRW')} — 실제 송금 후 기록하세요.</p><Payment action="refund" {...common}/></>}
 {staff&&remaining.length>0&&o.status==='confirmed'&&<ActionForm {...common} title="출고·송장 등록" action="ship" blocked={!canShip} transform={f=>({carrier:f.carrier,tracking:f.tracking,message:f.message,temperature:o.review?.temperature,items:remaining.filter(i=>Number(f['qty:'+i.id])>0).map(i=>({item_id:i.id,quantity:Number(f['qty:'+i.id])}))})}>
 {!canShip&&<p role="status" className="text-red-700">전액 입금 확인, 미해결 클레임 및 환불 대기 해소 후 출고할 수 있습니다.</p>}
 <fieldset disabled={!canShip} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label>운송사<select name="carrier" className={field}>{Object.entries(CARRIERS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>운송장 / 화물 배송 참조번호<input name="tracking" required minLength={3} maxLength={100} className={field}/></label></div>
 <p>확정 배송 온도: {TEMPERATURES[o.review?.temperature as keyof typeof TEMPERATURES]}</p>
 {remaining.map(i=><label className="block" key={i.id}>{i.snapshot.name} ({i.snapshot.unit}, 미출고 {i.snapshot.quantity-i.shipped_quantity-i.cancelled_quantity})
 <input name={'qty:'+i.id} type="number" min={0} max={i.snapshot.quantity-i.shipped_quantity-i.cancelled_quantity} step={1} defaultValue={0} className={field}/></label>)}
 <Reason label="포장·온도 유지 확인 및 출고 안내"/></fieldset></ActionForm>}
 {!staff&&o.status==='confirmed'&&<ActionForm {...common} title="입금 확인 요청" action="deposit_report"><p className="text-sm">입금자명·입금일·금액을 알려 주세요. 직원 확인 전에는 입금 완료로 바뀌지 않습니다.</p><Reason label="입금 정보 (전체 계좌번호는 입력하지 마세요)"/></ActionForm>}
 {!staff&&['confirmed','completed','cancelled'].includes(o.status)&&o.claim_status!=='open'&&<ActionForm {...common} title="취소·반품·클레임 상담 요청" action="claim"><Reason label="요청 내용 및 대상 상품"/></ActionForm>}
 {staff&&o.claim_status==='open'&&shipped&&remaining.length>0&&<ActionForm {...common} title="미출고 잔량 취소" action="cancel_remaining"><p className="text-sm">출고 이력은 유지하고 미출고 상품 금액만 감액합니다. 이미 발생한 배송비는 유지합니다.</p><label className="block">고객 합의 근거<input name="agreement" minLength={3} maxLength={1000} required className={field}/></label><Reason/></ActionForm>}
 {staff&&o.claim_status==='open'&&remaining.length===0&&o.status!=='cancelled'&&<ActionForm {...common} title="반품·클레임 합의 감액" action="credit" transform={f=>({...f,amount_minor:Number(f.amount_minor)})}>
 <p className="text-sm">반품 수령·품질 확인 및 고객 합의 후 감액합니다. 감액 후 환불 송금을 별도로 기록하세요. 증빙 수정 발행 여부도 확인해야 합니다.</p><label className="block">합의 감액 (VAT 포함 KRW)<input type="number" name="amount_minor" min={1} max={o.total_minor!-o.credit_minor} step={1} required className={field}/></label><label className="block">고객 합의 근거<input name="agreement" minLength={3} maxLength={1000} required className={field}/></label><Reason/></ActionForm>}
 {staff&&o.claim_status==='open'&&<ActionForm {...common} title="클레임 해결 기록" action="resolve_claim"><p className="text-sm">환불 대기 금액이 남아 있으면 종결할 수 없습니다.</p><Reason label="반품/교환 처리·환불·고객 합의 결과"/></ActionForm>}
 {!shipped&&o.status!=='cancelled'&&(staff||(['requested','reviewed'].includes(o.status)&&o.paid_minor===0))&&<ActionForm {...common} title="전체 주문 취소" action="cancel"><p className="text-sm">출고 전 전체 취소입니다. 입금액이 있으면 별도 환불 송금 기록이 필요합니다.</p><Reason/></ActionForm>}
 {staff&&<ActionForm {...common} title="거래 증빙 처리 기록" action="evidence"><p className="text-sm">증빙 발행 시스템에서 실제 처리한 뒤 종류·발행일·문서번호·전달 결과를 기록하세요. 이 기능은 발행 자체를 대신하지 않습니다.</p><Reason label="증빙 처리 결과 (고객에게 표시)"/></ActionForm>}
 </section>;
}
function Payment({action,...common}:{action:'deposit'|'refund'}&Pick<Props,'act'|'busy'>){
 return <ActionForm {...common} title={action==='deposit'?'은행 입금 확인 기록':'환불 송금 기록'} action={action} transform={f=>({...f,amount_minor:Number(f.amount_minor),occurred_at:new Date(String(f.occurred_at)).toISOString()})}>
 <p className="text-sm">통장 거래내역과 대조한 실제 거래만 등록하세요. 같은 은행 거래 참조번호는 다시 등록할 수 없습니다. 참조번호와 확인 근거는 직원에게만 표시됩니다.</p>
 <div className="grid gap-4 sm:grid-cols-2"><label>금액 (KRW)<input type="number" name="amount_minor" min={1} max={1000000000} step={1} required className={field}/></label><label>거래일시 (이 기기의 현지 시각)<input type="datetime-local" name="occurred_at" required className={field}/></label></div>
 <label className="block">은행 거래 참조번호<input name="reference" required minLength={3} maxLength={150} className={field}/></label><Reason label="통장 대조 확인 근거"/></ActionForm>;
}
