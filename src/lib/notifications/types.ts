export type EmailState='queued'|'sending'|'accepted'|'failed'|'uncertain';
export type EmailDelivery={notification_id:string;state:EmailState;attempt:number;last_code:string|null;updated_at:string};
export type MailPreview={recipient:string;subject:string;link:string;text:string;hash:string;delivery:EmailDelivery};
export const EMAIL_STATES:Record<EmailState,string>={queued:'발송 대기',sending:'발송 진행 중',accepted:'SMTP 서버 접수 · 수신 확인 아님',failed:'발송 실패 · 관리자 확인 필요',uncertain:'발송 결과 불명 · 자동 재발송 금지'};
