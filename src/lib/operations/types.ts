import type {StaffRole} from '../admin-auth';
export const STATUS_LABELS:Record<string,string>={new:'접수',reviewing:'검토 중',responded:'회신 완료',closed:'종결',requested:'공급·배송비 검토',reviewed:'고객 최종 확인 대기',confirmed:'확정',completed:'출고 처리 완료',cancelled:'취소',active:'활성',suspended:'중지',approved:'이용 가능',pending:'검토 대기',rejected:'이용 불가'};
export const ROLE_LABELS={admin:'관리자',product_staff:'상품 담당자',inquiry_staff:'문의 담당자',order_staff:'주문 담당자'};
export const WORK_LABELS={rfq:'미처리 해외 RFQ',inquiry:'미처리 국내 문의',pi_review:'PI 발행 검토',pi_preparing:'PI 발행 준비 미완료',pi_expired:'미수락 PI 만료',pi_soon:'PI 3일 이내 만료',pi_changes:'PI 수정 요청',order_review:'공급·배송비 검토',customer_confirm:'고객 최종 확인 대기',unpaid:'미입금',shipping:'출고 대기',refund:'환불 대기',claim:'클레임 확인',test_failed:'내부 테스트 전달 실패',test_queued:'내부 테스트 전달 대기'};
export const DOCUMENT_LABELS={preparing:'발행 준비 미완료',issued:'발행·수락 대기',accepted:'수락됨',expired:'미수락 만료',changes_requested:'수정 요청',superseded:'이전 버전',cancelled:'취소'};
export const QUALITY_LABELS={missing:'가격 승인 필요',data:'상품·검수 정보 누락',draft:'새 초안 검토',expired:'가격 만료',soon:'가격 7일 이내 만료'};
export const AUDIT_LABELS={access:'회원·회사',pricing:'가격·환율',inquiry:'문의·견적',pi:'PI 문서',order:'국내 주문'};
export const CONTACT_LABELS={personal:'개인 회원',company:'회사 연결 회원',suspended:'중지 관련 회원'};
export type Mode='work'|'documents'|'quality'|'contacts'|'audit';
export const TITLES:Record<Mode,string>={work:'업무 대시보드',documents:'Proforma Invoice 문서',quality:'상품·가격 점검',contacts:'개인·회사 거래처',audit:'통합 감사 이력'};
export const LABELS={work:WORK_LABELS,documents:DOCUMENT_LABELS,quality:QUALITY_LABELS,contacts:CONTACT_LABELS,audit:AUDIT_LABELS};
export type WorkRow={id:string;kind:'inquiry'|'order';title:string;subtitle:string;status:string;assigned_to:string|null;assigned_name:string|null;due_at:string|null;revision:number;created_at:string;tags:string[]};
export type OpsRow=Partial<WorkRow>&{id:string;title:string;subtitle:string;inquiry_id?:string;valid_until?:string;company_id?:string;company_name?:string;company_status?:string;membership_status?:string;price_list?:string;source?:string;target_id?:string;actor_name?:string;issues?:string[];sku?:string;price_list_id?:string;list_name?:string};
export type OpsData={items:OpsRow[];total:number;counts?:Record<string,number>;as_of:string;page:number;page_size:number;role:StaffRole;staff?:{id:string;name:string;role:StaffRole}[];rate_alert?:string};
export function rowLink(row:OpsRow,mode:Mode){
 if(mode==='quality')return '/admin/pricing?sku='+encodeURIComponent(row.sku||row.title)+'&list='+encodeURIComponent(row.price_list_id||'');
 if(mode==='contacts')return row.company_id?'/admin/companies?company='+encodeURIComponent(row.company_id):null;
 const id=row.inquiry_id||row.target_id||row.id,kind=row.source||row.kind;
 if(mode==='documents'||kind==='inquiry'||kind==='pi')return '/admin/crm?inquiry='+encodeURIComponent(id);
 if(kind==='order')return '/admin/orders?order='+encodeURIComponent(id);
 if(kind==='pricing')return '/admin/pricing';
 if(kind==='access')return '/admin/companies';
 return null;
}
export const kst=(value:string)=>new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
export function queryString(params:Record<string,string|string[]|undefined>){
 const q=new URLSearchParams();for(const [k,v]of Object.entries(params))if(typeof v==='string'&&['q','category','assigned','due','page','kind'].includes(k))q.set(k,v);return q.toString();
}
