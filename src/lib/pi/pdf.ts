import {PDFDocument,rgb,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {PiDocument} from './types';
import {InquiryValidationError} from '../commercial-inquiry';
export async function renderPiPdf(doc:Pick<PiDocument,'number'|'version'|'created_at'|'snapshot'>,fontBytes:Uint8Array){
 const pdf=await PDFDocument.create({updateMetadata:false});pdf.registerFontkit(fontkit);
 pdf.setTitle('PROFORMA INVOICE '+doc.number+' v'+doc.version);pdf.setAuthor(doc.snapshot.seller.name);
 pdf.setProducer('SONGFOOD PI renderer v1');pdf.setCreator('SONGFOOD');
 pdf.setCreationDate(new Date(doc.created_at));pdf.setModificationDate(new Date(doc.created_at));
 // Full embedding avoids confirmed missing glyphs with this CJK font's subset output.
 const font=await pdf.embedFont(fontBytes,{subset:false}),supported=new Set(font.getCharacterSet());
 const ink=rgb(.1,.16,.14),muted=rgb(.35,.39,.38),accent=rgb(.13,.32,.25);
 let page!:PDFPage,y=0;const width=595.28,height=841.89,left=40,right=555;
 function clean(s:string){const value=s.normalize('NFC').replace(/\r\n?/g,'\n');for(const c of value)if(c!=='\n'&&!supported.has(c.codePointAt(0)!))throw new InquiryValidationError({pdf:'PDF 글꼴에서 지원하지 않는 문자가 있습니다. 이름·주소·상품명을 한글/영문으로 확인해 주세요. (U+'+c.codePointAt(0)!.toString(16).toUpperCase()+')'});return value;}
 function draw(s:string,x:number,at:number,size=9,color=ink){page.drawText(clean(s),{x,y:at,size,font,color});}
 function newPage(){page=pdf.addPage([width,height]);page.drawRectangle({x:0,y:height-10,width,height:10,color:accent});draw('SONGFOOD / 송영민푸드',left,height-38,10,accent);draw('PROFORMA INVOICE',left,height-66,20);
 draw('견적송장 - Not a final Commercial Invoice',left,height-84,9,muted);
 draw(doc.number+' / v'+doc.version,left,height-102,9);y=height-124;}
 function ensure(h:number){if(y-h<66)newPage();}
 function wrap(text:string,max:number,size=9){const rows:string[]=[];for(const para of clean(text).split('\n')){let row='',length=0;for(const char of para){const w=font.widthOfTextAtSize(char,size);if(length+w>max&&row){rows.push(row.trimEnd());row='';length=0;}row+=char;length+=w;}rows.push(row.trimEnd());}return rows;}
 function paragraph(text:string,size=9){for(const row of wrap(text,right-left,size)){ensure(14);draw(row,left,y,size);y-=14;}y-=5;}
 function section(title:string){ensure(38);y-=8;page.drawRectangle({x:left,y:y-5,width:right-left,height:21,color:rgb(.93,.95,.94)});draw(title,left+7,y+1,10,accent);y-=25;}
 function tableHead(){ensure(40);draw('SKU / Product 상품',left,y,8);draw('CTN',313,y,8);draw('USD / CTN',366,y,8);draw('Amount USD',469,y,8);y-=15;page.drawLine({start:{x:left,y},end:{x:right,y},thickness:.7,color:accent});y-=14;}
 newPage();const s=doc.snapshot;
 paragraph('Issue reference date: '+new Date(doc.created_at).toISOString().slice(0,10)+'    Valid until: '+s.valid_until.replace('T',' ').replace('.000Z',' UTC'));
 section('SELLER / 판매자');paragraph(s.seller.name+'\n'+s.seller.address+'\n'+s.seller.email+' | '+s.seller.phone);
 section('BUYER / 구매자');paragraph(s.buyer.name+' / '+s.buyer.contact+'\n'+s.buyer.address+'\n'+s.buyer.country+' | Destination: '+(s.buyer.destination||'See buyer address'));
 section('GOODS / 상품');tableHead();
 for(const l of s.lines){const rows=wrap(l.sku+' | '+l.name+'\n'+l.ea_per_ctn+' EA/CTN | FOB '+l.loading_port,255,8),h=rows.length*12+13;
 if(y-h<66){newPage();tableHead();}rows.forEach((row,i)=>draw(row,left,y-i*12,8));
 draw(String(l.quantity),313,y,9);draw((l.unit_minor/100).toFixed(2),366,y,9);draw((l.total_minor/100).toFixed(2),469,y,9);
 y-=h;page.drawLine({start:{x:left,y:y+12},end:{x:right,y:y+12},thickness:.3,color:rgb(.8,.84,.82)});}
 ensure(55);y-=10;draw('TOTAL / 합계 USD '+(s.total_minor/100).toFixed(2),left,y,15,accent);y-=28;
 section('TRADE TERMS / 거래 조건');paragraph('FOB ports: '+[...new Set(s.lines.map(l=>l.loading_port))].join(', '));paragraph('Lead time / 납기: '+s.lead_time);
 paragraph('Documents / 요구 서류: '+(s.documents.join(', ')||'None requested / 요구 없음'));
 paragraph('Payment terms / 결제조건: '+s.seller.payment_terms);
 section('BANK DETAILS / 송금 정보');paragraph(s.seller.bank_details);
 section('REVISION & NOTICE / 변경·안내');paragraph('Reason / 변경 사유: '+s.change_reason);paragraph(s.notice,8);
 paragraph('최종 Commercial Invoice가 아닙니다. FOB 이행 비용은 VAT 제외 도매가에 포함합니다. 가격 조정은 사전 협의와 수정 PI로 기록하며, 수락된 조건을 일방적으로 변경하지 않습니다.',8);
 for(const [i,p]of pdf.getPages().entries()){page=p;draw(doc.number+' / v'+doc.version,left,34,8,muted);draw('PROFORMA INVOICE | '+(i+1)+' / '+pdf.getPageCount(),right-192,34,8,muted);}
 return pdf.save({useObjectStreams:true});
}
