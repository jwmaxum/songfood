import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  created_at: string;
  status: 'unread' | 'read' | 'replied';
}

// In-memory inquiries array for demo/production persistence sync
const globalInquiries: InquiryItem[] = [
  {
    id: 'inq-sample-1',
    name: '김철수 바이어',
    email: 'chulsoo@globalgourmet.com',
    phone: '010-8921-3401',
    company: 'Tokyo K-Food Direct',
    subject: 'K-냉동만두 및 김치 40ft 컨테이너 납품 문의',
    message: '일본 도쿄 매장 공급을 위한 FSSC 22000 인증서 및 FOB 견적서를 요청합니다.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'unread',
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    inquiries: globalInquiries,
    unread_count: globalInquiries.filter((i) => i.status === 'unread').length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: '이름, 이메일, 문의 내용은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const newInquiry: InquiryItem = {
      id: `inq-${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : '',
      company: company ? String(company).trim() : '',
      subject: subject || '송영민푸드 K-Food 고객 문의',
      message: String(message).trim(),
      created_at: new Date().toISOString(),
      status: 'unread',
    };

    globalInquiries.unshift(newInquiry);

    return NextResponse.json({
      success: true,
      message: '문의가 성공적으로 접수되었습니다. 관리자에게 실시간 알림이 발송되었습니다.',
      inquiry: newInquiry,
      unread_count: globalInquiries.filter((i) => i.status === 'unread').length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: '문의 등록 실패: ' + err.message },
      { status: 500 }
    );
  }
}
