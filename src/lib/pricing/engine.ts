import type { ExchangeRate, PriceLine, PriceRequest, PriceRevision, Preview } from './types';
import { FOB_NOTICE } from './types';
import { PricingError, readiness, unitsPerPackage } from './validation';
// Integer fractions keep VAT removal and currency conversion exact until the documented rounding step.
function decimal(value: string): [bigint,bigint] {
  if(!/^\d+(\.\d{1,6})?$/.test(value)) throw new PricingError('INVALID_DECIMAL','숫자 형식을 확인해 주세요.');
  const [whole,fraction='']=value.split('.');
  return [BigInt(whole+fraction),BigInt(10)**BigInt(fraction.length)];
}
function round(n:bigint,d:bigint):bigint { if(d<=BigInt(0)) throw new PricingError('INVALID_RATE','유효한 환율이 필요합니다.'); return (n*BigInt(2)+d)/(d*BigInt(2)); }
function safe(n:bigint) { if(n>BigInt(Number.MAX_SAFE_INTEGER)) throw new PricingError('AMOUNT_OVERFLOW','금액이 처리 범위를 넘었습니다.'); return Number(n); }
export function calculateLine(p:PriceRevision, item:PriceRequest, market:'domestic'|'export', rate:ExchangeRate|null, now=new Date()):PriceLine {
  if(!Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>100000 || !['EA','BOX','CTN'].includes(item.unit))
    throw new PricingError('INVALID_QUANTITY','수량은 1~100,000 사이 정수여야 합니다.');
  if(item.product_id!==p.product_id || p.status!=='approved') throw new PricingError('PRICE_UNAPPROVED','승인된 상품 가격이 없습니다.');
  const missing=readiness(p,market);
  if(missing.length) throw new PricingError('PRICE_INCOMPLETE','가격 확인 필요: '+missing.join(', '));
  if(Date.parse(p.valid_from!)>now.getTime() || Date.parse(p.valid_until!)<=now.getTime())
    throw new PricingError('PRICE_EXPIRED','가격 적용기간이 아니거나 만료되었습니다.');
  const count=unitsPerPackage(p,item.unit), baseCount=unitsPerPackage(p,p.price_unit!);
  const totalEa=count*item.quantity;
  const ranks={EA:0,BOX:1,CTN:2};
  if(ranks[item.unit]<ranks[p.minimum_order_unit!] || totalEa<unitsPerPackage(p,p.minimum_order_unit!)*p.minimum_order_quantity!)
    throw new PricingError('MOQ','최소 구매는 '+p.minimum_order_quantity+' '+p.minimum_order_unit+'입니다. 더 작은 포장 단위로 구매할 수 없습니다.');
  if(market==='export' && (item.unit!=='CTN' || item.quantity<p.export_moq_ctn!))
    throw new PricingError('MOQ','수출 최소 주문 수량은 '+p.export_moq_ctn+' CTN입니다.');
  let value=p.unit_price_krw!;
  for(const tier of [...p.tiers].sort((a,b)=>a.min_ea-b.min_ea)) if(totalEa>=tier.min_ea) value=tier.unit_price_krw;
  const [priceN,priceD]=decimal(value);
  const grossOrNetN=priceN*BigInt(count), baseD=priceD*BigInt(baseCount);
  const netN=p.tax_code==='vat10' && p.vat_included ? grossOrNetN*BigInt(10):grossOrNetN;
  const netD=p.tax_code==='vat10' && p.vat_included ? baseD*BigInt(11):baseD;
  let unitNet:bigint,unitTax=BigInt(0),validUntil=p.valid_until!;
  if(market==='export') {
    if(!rate || Date.parse(rate.observed_at)>now.getTime() || Date.parse(rate.valid_until)<=now.getTime())
      throw new PricingError('RATE_EXPIRED','승인된 유효 환율이 없습니다. 견적 문의해 주세요.');
    const [rn,rd]=decimal(String(rate.krw_per_usd));
    if(rn<=BigInt(0)) throw new PricingError('INVALID_RATE','환율은 0보다 커야 합니다.');
    unitNet=round(netN*rd*BigInt(100),netD*rn);
    if(Date.parse(rate.valid_until)<Date.parse(validUntil)) validUntil=rate.valid_until;
  } else {
    unitNet=round(netN,netD);
    if(p.tax_code==='vat10') unitTax=p.vat_included ? round(grossOrNetN,baseD)-unitNet : round(unitNet,BigInt(10));
  }
  if(unitNet<=BigInt(0)) throw new PricingError('PRICE_TOO_SMALL','포장 단가가 최소 통화 단위보다 작습니다. 가격을 검토해 주세요.');
  const unitTotal=unitNet+unitTax,q=BigInt(item.quantity);
  return {...item,tax_code:p.tax_code!,currency:market==='export'?'USD':'KRW',unit_net_minor:safe(unitNet),unit_tax_minor:safe(unitTax),
    unit_total_minor:safe(unitTotal),net_minor:safe(unitNet*q),tax_minor:safe(unitTax*q),total_minor:safe(unitTotal*q),
    ea_per_unit:count,price_version_id:p.id,price_version:p.version,exchange_rate_id:market==='export'?rate!.id:null,
    valid_until:validUntil,loading_port:market==='export'?p.loading_port:null};
}
export function summarize(lines:PriceLine[],market:'domestic'|'export'):Preview {
  const sum=(key:'net_minor'|'tax_minor'|'total_minor')=>safe(lines.reduce((n,x)=>n+BigInt(x[key]),BigInt(0)));
  return {kind:'price_preview',market,currency:market==='export'?'USD':'KRW',lines,net_minor:sum('net_minor'),
    tax_minor:sum('tax_minor'),total_minor:sum('total_minor'),
    notice:market==='export'?FOB_NOTICE:'서버 가격 미리보기입니다. 배송비·결제금액과 주문은 아직 확정되지 않았습니다.'};
}
