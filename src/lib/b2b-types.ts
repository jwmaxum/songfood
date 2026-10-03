export type CompanyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type Company = {
  id: string; name: string; kind: 'domestic' | 'overseas'; country: string;
  registration_no: string | null; status: CompanyStatus; created_at: string;
};
export type Membership = { company_id: string; role: 'owner' | 'member'; status: 'active' | 'suspended' };
export type CustomerSession = {
  user: { id: string; email: string; name: string };
  company: Company | null;
  membership: Membership | null;
};
export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: '승인 대기', approved: '이용 가능', rejected: '승인 거절', suspended: '거래 중지',
};
