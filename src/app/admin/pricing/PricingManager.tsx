'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ExchangeRate, PriceDraft, PriceList, PriceRevision } from '@/lib/pricing/types';
import { UNIT_LABELS } from '@/lib/pricing/types';
import { readiness } from '@/lib/pricing/validation';
import { CSV_COLUMNS, type CsvRow } from '@/lib/pricing/csv';
import ExchangeRateWidget from '../ExchangeRateWidget';
type Product={id:string;sku:string;name:string;wholesale_price_krw:number|null;carton_qty:number|null;moq_cartons:number|null;loading_port:string|null};
type Data={products:Product[];lists:PriceList[];revisions:PriceRevision[];rates:ExchangeRate[];canApprove:boolean;audit:{id:string;action:string;record_id:string;created_at:string}[]};
const input='mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2.5 text-sm text-white';
function localDate(iso:string|null) {if(!iso)return '';const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export default function PricingManager() {
  const [data,setData]=useState<Data|null>(null),[listId,setListId]=useState('00000000-0000-4000-8000-000000000201');
  const [draft,setDraft]=useState<PriceDraft|null>(null),[tiers,setTiers]=useState('[]'),[search,setSearch]=useState('');
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[csv,setCsv]=useState(''),[csvRows,setCsvRows]=useState<CsvRow[]>([]);
  const refresh=useCallback(async()=>{
    const r=await fetch('/api/admin/pricing',{cache:'no-store'}),body=await r.json();
    if(!r.ok)throw new Error(body.error || '가격 관리 연결 실패');setData(body);
  },[]);
  useEffect(()=>{const c=new AbortController();fetch('/api/admin/pricing',{cache:'no-store',signal:c.signal}).then(async r=>{
    const b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);const params=new URLSearchParams(window.location.search);setSearch(params.get('sku')||'');if(b.lists.some((l:PriceList)=>l.id===params.get('list')))setListId(params.get('list')!);
  }).catch(e=>{if(e.name!=='AbortError')setMessage(e.message);});return()=>c.abort();},[]);
  async function send(body:object) {
    setBusy(true);setMessage('');
    try {
      const r=await fetch('/api/admin/pricing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await r.json();if(!r.ok)throw new Error(result.error);
      if('rows' in result)setCsvRows(result.rows);else {await refresh();setMessage('저장되었습니다. 승인 전 초안은 고객 가격에 적용되지 않습니다.');}
      return true;
    } catch(e) {setMessage(e instanceof Error?e.message:'저장 실패');return false;}
    finally {setBusy(false);}
  }
  const revisions=(id:string)=>data?.revisions.filter(r=>r.product_id===id && r.price_list_id===listId).sort((a,b)=>b.version-a.version)||[];
  function edit(product:Product) {
    const versions=revisions(product.id),latest=versions[0],approved=versions.find(v=>v.status==='approved');
    const next:PriceDraft=latest?{...latest,supersedes_id:approved?.id||null}:{
      product_id:product.id,price_list_id:listId,price_unit:'EA',unit_price_krw:product.wholesale_price_krw?String(product.wholesale_price_krw):null,
      tax_code:null,vat_included:null,ea_per_box:null,boxes_per_carton:null,ea_per_carton:product.carton_qty||null,
      minimum_order_unit:null,minimum_order_quantity:null,export_moq_ctn:product.moq_cartons||null,tiers:[],
      valid_from:null,valid_until:null,fob_status:'unreviewed',loading_port:product.loading_port||'',
      cost_review:'',review_source:'',change_reason:'',supersedes_id:approved?.id||null,
    };
    setDraft(next);setTiers(JSON.stringify(next.tiers,null,2));setMessage('');
  }
  function update(key:keyof PriceDraft,value:unknown){setDraft(old=>old?{...old,[key]:value}:old);}
  const number=(key:keyof PriceDraft,label:string)=><label className="text-sm" key={key}>{label}<input className={input} type="number" min="1" step="1" value={String(draft?.[key]??'')} onChange={e=>update(key,e.target.value===''?null:Number(e.target.value))}/></label>;
  const text=(key:keyof PriceDraft,label:string)=><label className="text-sm" key={key}>{label}<input className={input} maxLength={key==='unit_price_krw'?30:1000} value={String(draft?.[key]??'')} onChange={e=>update(key,e.target.value)}/></label>;
  const unit=(key:'price_unit'|'minimum_order_unit',label:string)=><label className="text-sm">{label}<select className={input} value={String(draft?.[key]||'')} onChange={e=>update(key,e.target.value||null)}><option value="">확인 필요</option>{Object.entries(UNIT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>;
  async function saveDraft() {
    try {const parsed=JSON.parse(tiers);if(await send({action:'draft',draft:{...draft,tiers:parsed}}))setDraft(null);}
    catch {setMessage('수량구간 JSON 형식을 확인해 주세요.');}
  }
  function downloadTemplate() {
    const blob=new Blob(['\uFEFF'+CSV_COLUMNS.join(',')+'\r\n'],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='songfood-pricing-template.csv';a.click();URL.revokeObjectURL(url);
  }
  const products=data?.products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(search.toLowerCase()))||[];
  return <main className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
    <div><h1 className="text-2xl font-bold">상품 가격·최소구매단위 관리</h1><p className="mt-3 text-sm text-stone-400">개인도 사업자도 가입 승인 없이 이용합니다. 상품별 포장과 최소구매단위를 검수하고 가격 초안을 승인해 주세요. 원본 금액·환율·변경 이력은 고객에게 공개되지 않습니다.</p></div>
    {message&&<p role="status" className="rounded border border-amber-700 bg-amber-950/30 p-4 text-sm">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2"><label>가격표<select value={listId} onChange={e=>{setListId(e.target.value);setDraft(null);setCsvRows([]);}} className={input}>{data?.lists.map(l=><option key={l.id} value={l.id}>{l.name} · {l.scope}</option>)}</select></label><label>상품 검색<input value={search} onChange={e=>setSearch(e.target.value)} className={input} placeholder="SKU / 상품명"/></label></div>
    {!data?<p>관리 자료를 불러오는 중입니다.</p>:<div className="overflow-x-auto rounded border border-stone-700"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-stone-900"><tr><th className="p-3">상품 / SKU</th><th className="p-3">최소구매</th><th className="p-3">최근 가격 상태</th><th className="p-3">검수</th><th className="p-3">관리</th></tr></thead><tbody>{products.map(p=>{
      const row=revisions(p.id)[0],missing=row?readiness(row):['미등록'];
      return <tr key={p.id} className="border-t border-stone-800"><td className="max-w-sm p-3">{p.name}<span className="mt-1 block text-xs text-stone-400">{p.sku}</span></td><td className="p-3">{row?.minimum_order_unit?row.minimum_order_quantity+' '+row.minimum_order_unit:'미확정'}</td><td className="p-3">{row?'v'+row.version+' · '+row.status:'초안 필요'}</td><td className="max-w-xs p-3 text-xs text-stone-400">{missing.length?missing.join(', '):'국내 필수값 입력 완료'}{row&&readiness(row,'export').length>0&&<span className="mt-1 block text-amber-300">해외: {readiness(row,'export').join(', ')}</span>}</td><td className="p-3"><button onClick={()=>edit(p)} className="text-amber-300 underline">단위·가격 수정</button>{row?.status==='draft'&&data.canApprove&&<button disabled={busy||missing.length>0} onClick={()=>void send({action:'approve',id:row.id})} className="mt-2 block rounded border px-3 py-1 disabled:opacity-30">검수 승인</button>}</td></tr>;
    })}</tbody></table></div>}
    {draft&&<section className="rounded-xl border border-amber-700 bg-stone-900 p-5"><h2 className="text-xl font-bold">{data?.products.find(p=>p.id===draft.product_id)?.name}</h2><p className="mt-2 text-sm text-stone-400">기존 도매가는 EA 기준으로 가져옵니다. 최소구매단위·VAT·포장 입수는 상품별로 확인해 주세요.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {unit('minimum_order_unit','최소구매단위 *')}{number('minimum_order_quantity','최소구매수량 *')}{unit('price_unit','도매가격 기준 단위 *')}
        {text('unit_price_krw','국내 도매가격 (KRW) *')}
        <label className="text-sm">과세 구분 *<select className={input} value={draft.tax_code||''} onChange={e=>update('tax_code',e.target.value||null)}><option value="">확인 필요</option><option value="vat10">10% 과세</option><option value="exempt">면세</option></select></label>
        <label className="text-sm">입력가격의 VAT 포함 여부 *<select className={input} value={draft.vat_included===null?'':String(draft.vat_included)} onChange={e=>update('vat_included',e.target.value===''?null:e.target.value==='true')}><option value="">확인 필요</option><option value="true">VAT 포함</option><option value="false">VAT 별도 공급가액</option></select></label>
        {number('ea_per_box','BOX당 EA 수')}{number('boxes_per_carton','CTN당 BOX 수')}{number('ea_per_carton','CTN 총 EA 수')}
        {number('export_moq_ctn','해외 RFQ 최소 CTN 수')}
        {(['valid_from','valid_until'] as const).map(key=><label className="text-sm" key={key}>{key==='valid_from'?'가격 적용 시작 *':'가격 유효 종료 *'}<input type="datetime-local" className={input} value={localDate(draft[key])} onChange={e=>update(key,e.target.value?new Date(e.target.value).toISOString():null)}/></label>)}
        <label className="text-sm">FOB 비용 검토<select className={input} value={draft.fob_status} onChange={e=>update('fob_status',e.target.value)}><option value="unreviewed">검토 전</option><option value="included">VAT 제외 도매가에 비용 포함 확인</option><option value="adjustment_required">금액 조정 협의 필요</option></select></label>
        {text('loading_port','FOB 선적항')}{text('cost_review','내부 FOB 비용 검토 근거')}{text('review_source','상품·가격 검수 출처 *')}{text('change_reason','등록·가격 조정 사유 *')}
      </div>
      <label className="mt-4 block text-sm">수량구간별 단가 (기준은 해당 포장 행의 EA 환산수량, 금액 단위는 위 도매가격 기준 단위)<textarea rows={4} className={input} value={tiers} onChange={e=>setTiers(e.target.value)} placeholder='[{"min_ea":100,"unit_price_krw":"10000"}]'/></label>
      <p className="mt-3 text-xs text-stone-400">국내 운송·수출통관·본선 적재 비용을 고객 가격에 자동 추가하지 않습니다. 조정이 필요하면 사유를 남긴 새 가격 버전을 검수·승인해 주세요.</p>
      <div className="mt-5 flex gap-3"><button disabled={busy} onClick={()=>void saveDraft()} className="rounded bg-amber-300 px-5 py-3 font-bold text-black">새 가격 초안 저장</button><button onClick={()=>setDraft(null)} className="rounded border px-5 py-3">닫기</button></div>
      <details className="mt-4"><summary>이 상품의 버전 이력</summary>{revisions(draft.product_id).map(r=><p key={r.id} className="mt-2 text-xs">v{r.version} · {r.status} · {r.unit_price_krw??'미입력'} KRW/{r.price_unit??'?'} · {r.change_reason} · {new Date(r.created_at).toLocaleString('ko-KR')}</p>)}</details>
    </section>}
    <section className="rounded-xl border border-stone-700 p-5"><h2 className="text-xl font-bold">CSV 일괄 검수</h2><p className="mt-2 text-sm text-stone-400">등록된 SKU에만 적용합니다. 중복·잘못된 행은 전체 저장을 막고, 필수 검수값이 빈 행은 초안으로만 저장합니다. 저장 후 상품별로 승인하세요. 날짜는 시간대가 포함된 ISO 형식입니다.</p>
      <div className="mt-3 flex flex-wrap gap-4"><button className="underline" onClick={downloadTemplate}>CSV 템플릿 받기</button><input aria-label="가격 CSV 파일" type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>256000){setMessage('CSV는 256KB 이하입니다.');return;}setCsv(await file.text());setCsvRows([]);}}}/></div>
      <textarea aria-label="가격 CSV 내용" className={input} rows={5} value={csv} onChange={e=>{setCsv(e.target.value);setCsvRows([]);}}/>
      <div className="mt-3 flex gap-3"><button disabled={busy||!csv} className="rounded border px-4 py-2" onClick={()=>void send({action:'preview_csv',csv,price_list_id:listId})}>행별 미리보기</button><button disabled={busy||!csvRows.length||csvRows.some(r=>r.errors.length)} className="rounded bg-amber-300 px-4 py-2 text-black disabled:opacity-30" onClick={()=>void send({action:'import_csv',csv,price_list_id:listId})}>검증된 행을 초안으로 저장</button></div>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">{csvRows.map(r=><li key={r.row} className={r.errors.length?'text-red-300':'text-stone-300'}>행 {r.row} · {r.sku} · {r.errors.length?r.errors.join(', '):r.missing.length?'초안 / 미확정: '+r.missing.join(', '):'필수값 입력 완료'}</li>)}</ul>
    </section>
    <div id="exchange-rate" className="scroll-mt-5"><ExchangeRateWidget/></div>
    {data?.canApprove&&<details className="rounded border border-stone-700 p-5"><summary>별도 가격표 추가</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void send({action:'create_list',...Object.fromEntries(new FormData(e.currentTarget))});}}><label>이름<input name="name" required className={input}/></label><label>대상<select name="scope" className={input}><option value="company">특정 회사 계약가</option><option value="personal">개인회원</option><option value="business">사업자회원</option></select></label><label>특정 회사 코드 (회사 계약가만)<input name="company_id" className={input}/></label><label>가격표 배정 사유<input name="reason" required minLength={3} maxLength={1000} className={input}/></label><button disabled={busy} className="rounded border px-4 py-2">가격표 추가</button></form></details>}
    <details className="rounded border border-stone-700 p-5"><summary>최근 변경·승인 기록</summary>{data?.audit.map(a=><p key={a.id} className="mt-2 break-all text-xs text-stone-400">{new Date(a.created_at).toLocaleString('ko-KR')} · {a.action} · {a.record_id}</p>)}</details>
  </main>;
}
