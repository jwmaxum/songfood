import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/labels/regulatory-feed',
    description: 'aT KATI / FDA / GACC / EFSA Global Regulatory Feed Webhook Endpoint',
    subscribedSources: [
      { name: 'aT KATI', status: 'connected', region: 'Global' },
      { name: 'US FDA CFSAN Recall & Rule Updates', status: 'connected', region: 'US' },
      { name: 'China GACC Official Notices', status: 'connected', region: 'CN' },
      { name: 'Japan CAA Food Labeling Division', status: 'connected', region: 'JP' },
      { name: 'EU RASFF & EFSA Journal', status: 'connected', region: 'EU' },
      { name: 'UAE MoIAT & ESMA Standards', status: 'connected', region: 'UAE' },
    ],
    lastSync: '2026-09-10T00:00:00Z',
  });
}
