import type {StaffRole} from '../admin-auth';
import {WORK_LABELS} from './types';
import type {HandoverData} from '../launch/handover';
export type InitialMetrics={active:number;mine:number;unassigned:number;reassignment:number;overdue:number;soon:number};
export type InitialOperations={role:StaffRole;as_of:string;metrics:InitialMetrics;counts:Record<string,number>;service:{owner:string;response_minutes:number|null;inquiries_paused:boolean;orders_paused:boolean;pi_paused:boolean};quality?:{counts:Record<string,number>;as_of:string;rate_alert:string};assessment?:HandoverData['assessment']};
export function initialWorkLinks(role:StaffRole,counts:Record<string,number>){
 const keys=role==='admin'?Object.keys(WORK_LABELS):role==='inquiry_staff'?['mail_unknown','mail_failed','mail_queued','rfq','inquiry','pi_preparing','pi_changes','pi_expired','pi_soon','pi_review','test_failed','test_queued']:role==='order_staff'?['claim','refund','unpaid','shipping','order_review','customer_confirm']:[];
 return keys.filter(k=>k!=='reassignment').map(key=>({key,label:WORK_LABELS[key as keyof typeof WORK_LABELS],count:counts[key]||0,href:'/admin?category='+key+'&page=1'}));
}
export const INITIAL_ROUTINE=[
 {title:'업무 시작',detail:'현재 담당자·대응 목표와 접수 상태를 확인합니다. 기한 경과 → 재배정 필요 → 미배정 → 내 담당 순으로 확인하고 다음 행동·마감을 기록합니다.'},
 {title:'은행 대조·출고',detail:'실제 은행 내역을 대조한 입금만 기록합니다. 고객 최종 확인·순입금·클레임과 잔여 수량을 확인하고 출고합니다. 미해결 환불·클레임은 완료 주문도 확인합니다.'},
 {title:'PI·고객 메일',detail:'발행 준비·수정 요청·미수락 만료를 확인합니다. 고객 메일의 실패·결과 불명은 CRM에서 결과와 사유를 검토하고 관리자에게 복구를 요청합니다. SMTP 접수만으로 수신 완료 처리하지 않습니다.'},
 {title:'교대·장애 대응',detail:'업무별 담당자·기한·다음 행동을 저장하고 전체 업무 이력을 확인합니다. 거래 자료 오류나 장애는 운영 담당자에게 전달하고 관리자가 필요한 신규 접수를 중지합니다. 최신 자료 재검수 후 재개합니다.'},
] as const;
