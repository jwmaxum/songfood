import {businessGaps,businessFields,type BusinessProfile} from '../business-settings';
import type {LaunchFacts,ServiceControls,LaunchCheck} from './types';
export function launchChecks(f:LaunchFacts,c:ServiceControls,profile:BusinessProfile):LaunchCheck[]{
 const gaps=businessGaps(profile);
 return [
 {id:'business',title:'회사 정보·배송·반품·개인정보 안내',ready:gaps.length===0,detail:gaps.length?gaps.map(k=>businessFields[k][0]).join(', ')+' 미등록':'공개 필수 정보 입력 완료 · 실제 근거는 운영자가 확인',href:'/admin/settings'},
 {id:'prices',title:'개인 구매 가능한 승인 가격',ready:f.priced_products>0,detail:f.priced_products+' / '+f.products+'개 상품에 현재 유효한 공통·개인 가격. 출시 SKU·입수·MOQ·FOB 검수는 가격 점검에서 확인',href:'/admin/quality'},
 {id:'fx',title:'유효한 환율',ready:f.exchange_ready,detail:f.exchange_ready?'최신 승인 환율 유효':'최신 환율 없음 또는 만료',href:'/admin/pricing'},
 {id:'bank',title:'국내 입금 계좌',ready:f.bank_ready,detail:f.bank_ready?'설정 등록 · 계좌 소유·배송비 기준 실제 확인 필요':'실제 입금 계좌 미등록',href:'/admin/orders'},
 {id:'issuer',title:'PI 판매자·결제 조건',ready:f.issuer_ready,detail:f.issuer_ready?'설정 등록 · 실제 판매자·조건 확인 필요':'PI 판매자·결제 조건 미등록',href:'/admin/crm'},
 {id:'storage',title:'PI 비공개 저장소',ready:f.private_pi_storage,detail:f.private_pi_storage?'비공개 b2b-proforma 버킷 확인':'PI 저장소 없음 또는 공개 상태',href:'/admin/documents'},
 {id:'notification',title:'바이어 문서 알림 운영 방식',ready:false,detail:'현재 문서 알림은 테스트 수신함입니다. 이메일 인증 SMTP와 별개입니다. 실제 문서 통지 방식·담당자 확인 필요',href:'/admin/crm'},
 {id:'owner',title:'장애 대응 담당자·목표 시간',ready:!!c.owner.trim()&&c.response_minutes!==null,detail:c.owner?c.owner+' · '+(c.response_minutes??'미정')+'분 내 대응 목표':'운영 책임자와 대응 목표 미등록',href:'/admin/launch'},
 {id:'incidents',title:'알림 실패·발행 준비 문서',ready:f.failed_notifications===0&&f.preparing_pi===0,detail:'알림 실패 '+f.failed_notifications+'건 · 발행 준비 '+f.preparing_pi+'건',href:'/admin/documents'},
 ];
}
export const manualLaunchChecks=[
 '독립 Supabase DB·Auth·Storage와 Worker 스테이징에서 개인·국내 회사·해외 바이어 UAT 기록',
 '승인된 출시 SKU·가격·세금·입수·MOQ·국가·콜드체인·FOB 조건의 운영자 검수',
 'DB·Auth·Storage 파일 백업과 별도 DB 복구 검증, 보관 위치·복호화 키·일정·책임자',
 '이전 Worker 버전으로 복귀 후 읽기·권한·저장 호환성을 확인한 롤백 기록',
 '실제 문의·주문·PI 업무 담당자, 문서 통지 방식과 모니터 실패 알림 수신 설정',
 '배포 커밋·URL·검증 시각과 허용된 상업 공개 범위 확정',
];
