import type {StaffRole} from '../admin-auth';
import type {LaunchCheck,ServiceControls} from './types';
import type {ReleaseRow} from './releases';
export const HANDOVER_CHECKS=[
 {id:'access',title:'내 직원 로그인·업무 권한',roles:['admin','product_staff','inquiry_staff','order_staff'],href:'/admin/account',detail:'내 계정으로 로그인하고 허용 업무와 권한 없는 업무의 차단을 확인합니다.'},
 {id:'auth_mail',title:'내 인증 메일 수신·로그인',roles:['admin','product_staff','inquiry_staff','order_staff'],href:'/admin/account',detail:'내 받은편지함·스팸함과 링크 로그인 결과를 직접 확인합니다.'},
 {id:'catalogue',title:'출시 대상 상품·가격·MOQ 인수',roles:['admin','product_staff'],href:'/admin/releases',detail:'관리자 상품·가격 자료와 국내/해외 출시 검수 근거를 확인합니다.'},
 {id:'domestic',title:'국내 주문·입금·출고 인수',roles:['admin','order_staff'],href:'/admin/orders',detail:'고객 확정·입금 대조·출고·마이페이지를 검수합니다. 실제 완료 주문 ID가 필요합니다.'},
 {id:'export',title:'RFQ·FOB·Proforma Invoice 인수',roles:['admin','inquiry_staff'],href:'/admin/crm',detail:'VAT 제외 FOB·협의 가능 금액·PI 표시와 고객 수락을 확인합니다. 실제 수락된 발행 PI ID가 필요합니다.'},
 {id:'document_mail',title:'고객 문서 메일 실제 수신',roles:['admin','inquiry_staff'],href:'/admin/mail',detail:'허가된 고객의 메일 수신·문서 링크·중복 방지를 직접 확인합니다. SMTP 접수된 알림 ID와 수신 확인이 필요합니다.'},
 {id:'operations',title:'운영 담당자·중지·재개 인수',roles:['admin'],href:'/admin/launch',detail:'등록 직원 담당자·대응 목표와 신규 접수 중지/재개, 기존 기록 조회를 확인합니다.'},
 {id:'business',title:'회사·계좌·배송·반품 기준 인수',roles:['admin'],href:'/admin/settings',detail:'등록 회사·개인정보 안내와 실제 정책 근거를 확인합니다. 거래별 계좌와 판매자 조건도 각 업무에서 확인합니다.'},
] as const;
export type HandoverKey=typeof HANDOVER_CHECKS[number]['id'];
export type HandoverReview={check_id:HandoverKey;staff_id:string;revision:number;result:'passed'|'blocked';notes:string;reference_id:string|null;received:boolean;basis:string;reviewed_at:string;current:boolean};
export type HandoverData={actor_id:string;role:StaffRole;basis:Record<HandoverKey,string>;staff:{id:string;name:string;role:StaffRole}[];reviews:HandoverReview[];events:{id:string;check_id:HandoverKey;staff_id:string;result:string;notes:string;created_at:string}[];assessment?:{domestic:{ready:boolean;gaps:string[]};export:{ready:boolean;gaps:string[]}}};
export function canReview(key:HandoverKey,role:StaffRole){return (HANDOVER_CHECKS.find(c=>c.id===key)?.roles as readonly string[]|undefined)?.includes(role)===true;}
export function assessHandover(data:HandoverData,checks:LaunchCheck[],controls:ServiceControls,products:ReleaseRow[]){
 const passed=(key:HandoverKey,staff?:string)=>data.reviews.some(r=>r.check_id===key&&(!staff||r.staff_id===staff)&&r.result==='passed'&&r.current);
 const staffGaps=data.staff.flatMap(s=>(['access','auth_mail'] as const).filter(k=>!passed(k,s.id)).map(k=>s.name+' · '+HANDOVER_CHECKS.find(c=>c.id===k)!.title));
 if(!data.staff.length)staffGaps.push('등록된 활성 직원');
 const channel=(mode:'domestic'|'export')=>{
  const required=mode==='domestic'?['business','prices','bank','owner','incidents']:['business','fx','issuer','storage','notification','owner','incidents'];
  const gaps=[...staffGaps,...required.filter(id=>!checks.find(c=>c.id===id)?.ready).map(id=>checks.find(c=>c.id===id)?.title||id)];
  const manual:HandoverKey[]=mode==='domestic'?['business','catalogue','domestic','operations']:['business','catalogue','export','document_mail','operations'];
  gaps.push(...manual.filter(k=>!passed(k)).map(k=>HANDOVER_CHECKS.find(c=>c.id===k)!.title));
  if(!checks.find(c=>c.id==='release')?.ready)gaps.push('승인 상품 거래 제한 활성화');
  if(!products.some(p=>p.review?.fingerprint===p.fingerprint&&p.review[mode]&&(mode==='domestic'?p.domestic_issues:p.export_issues).length===0))gaps.push(mode==='domestic'?'유효한 국내 출시 상품':'유효한 해외 출시 상품');
  if(mode==='domestic'?controls.orders_paused:controls.inquiries_paused||controls.pi_paused)gaps.push('해당 신규 거래 접수 중지 상태');
  return {ready:gaps.length===0,gaps:[...new Set(gaps)]};
 };
 return {domestic:channel('domestic'),export:channel('export')};
}
