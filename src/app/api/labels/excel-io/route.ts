import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    endpoint: '/api/labels/excel-io',
    description: 'Excel bulk export/import metadata service',
    supportedCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    sheets: [
      'Master_Catalog_Summary',
      'US_FDA_Spec',
      'CN_GACC_Spec',
      'JP_CAA_Spec',
      'EU_FIC_Spec',
      'UAE_MoIAT_Spec',
    ],
  });
}
