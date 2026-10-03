import type { PriceDraft } from './types';
import { parseDraft, readiness } from './validation';
export const CSV_COLUMNS = ['sku','price_unit','unit_price_krw','tax_code','vat_included','ea_per_box','boxes_per_carton',
 'ea_per_carton','minimum_order_unit','minimum_order_quantity','export_moq_ctn','valid_from','valid_until',
 'fob_status','loading_port','cost_review','review_source','change_reason','tiers'] as const;
export function readCsv(input:string): string[][] {
  if(input.length>256000) throw new Error('CSV는 256KB 이하로 입력해 주세요.');
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  const text=input.replace(/^\uFEFF/,'').replaceAll('\r\n','\n');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') { if(text[i+1]==='"') { field+='"';i++; } else { quoted=false;closed=true; } } else field+=c;continue; }
    if(c==='"') { if(field || closed) throw new Error('CSV 따옴표 위치를 확인해 주세요.'); quoted=true; }
    else if(c===',' || c==='\n') { row.push(field);field='';closed=false;if(c==='\n') { if(row.some(x=>x!==''))rows.push(row);row=[]; } }
    else { if(closed && c.trim())throw new Error('CSV 인용부호 뒤 문자를 확인해 주세요.'); if(!closed)field+=c; }
  }
  if(quoted)throw new Error('CSV 인용부호가 닫히지 않았습니다.');
  row.push(field);if(row.some(x=>x!==''))rows.push(row);
  if(rows.length>201)throw new Error('CSV는 한 번에 200개 상품까지 가능합니다.');
  return rows;
}
export type CsvRow = { row:number; sku:string; draft:PriceDraft|null; errors:string[]; missing:string[] };
export function previewCsv(text:string, products:{id:string;sku?:string}[], listId:string, bases:Record<string,string> = {}):CsvRow[] {
  const rows=readCsv(text),headers=rows.shift()?.map(x=>x.trim())||[];
  if(!headers.includes('sku') || new Set(headers).size!==headers.length || headers.some(x=>!(CSV_COLUMNS as readonly string[]).includes(x)))
    throw new Error('CSV 열 이름은 템플릿을 사용하고 SKU 열을 포함해 주세요.');
  const counts=new Map<string,number>();
  for(const row of rows) {const sku=row[headers.indexOf('sku')]?.trim()||'';counts.set(sku,(counts.get(sku)||0)+1);}
  return rows.map((row,index)=>{
    const sku=row[headers.indexOf('sku')]?.trim()||'';
    try{
      if(row.length!==headers.length)throw new Error('열 개수가 헤더와 다릅니다.');
      if(!sku || counts.get(sku)!==1)throw new Error('SKU가 없거나 CSV 안에서 중복됩니다.');
      const matches=products.filter(p=>p.sku===sku);
      if(matches.length!==1)throw new Error('등록되지 않았거나 DB에서 중복된 SKU입니다.');
      const fields:Record<string,unknown>=Object.fromEntries(headers.map((h,i)=>[h,row[i].trim()]));
      if(fields.vat_included!=='' && fields.vat_included!==undefined && !['true','false'].includes(String(fields.vat_included)))
        throw new Error('vat_included는 true/false 또는 빈 값입니다.');
      fields.vat_included=fields.vat_included==='' || fields.vat_included===undefined?null:fields.vat_included==='true';
      fields.tiers=fields.tiers?JSON.parse(String(fields.tiers)):[];
      const draft=parseDraft({...fields,product_id:matches[0].id,price_list_id:listId,supersedes_id:bases[matches[0].id]||null});
      return {row:index+2,sku,draft,errors:[],missing:readiness(draft,'export')};
    } catch(e) {return {row:index+2,sku,draft:null,errors:[e instanceof Error?e.message:'CSV 오류'],missing:[]};}
  });
}
