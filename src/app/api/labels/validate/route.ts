import { NextRequest, NextResponse } from 'next/server';
import { validateLabel, ValidationInput } from '@/lib/label-compliance';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    name: 'SongFood Regulatory Compliance Validation API',
    description: 'Validates food product label compliance for 5 target export markets (US, CN, JP, EU, UAE)',
    version: '1.0.0'
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidationInput = await req.json();

    if (!body || !body.country) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: target "country" is required (US, CN, JP, EU, UAE).'
        },
        { status: 400 }
      );
    }

    const validationResult = validateLabel(body);

    return NextResponse.json({
      success: true,
      data: validationResult
    });
  } catch (err: any) {
    console.error('[api/labels/validate] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error during compliance validation.'
      },
      { status: 500 }
    );
  }
}
