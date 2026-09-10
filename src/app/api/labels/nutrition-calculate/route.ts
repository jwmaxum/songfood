import { NextRequest, NextResponse } from 'next/server';
import { calculateGlobalNutrition, BaseNutritionInput } from '@/lib/nutrition-calculator';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    name: 'SongFood Nutrition Calculation API',
    description: 'Calculates 5-country compliant nutrition facts from 100g base input',
    version: '1.0.0',
    supportedCountries: ['US', 'CN', 'JP', 'EU', 'UAE']
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: BaseNutritionInput = await req.json();

    if (!body || typeof body.caloriesKcal !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: caloriesKcal and basic nutrition data are required.'
        },
        { status: 400 }
      );
    }

    // 기본값 보정
    const normalizedInput: BaseNutritionInput = {
      baseWeightG: body.baseWeightG || 100,
      servingSizeG: body.servingSizeG || 100,
      servingsPerContainer: body.servingsPerContainer || 1,
      servingSizeHousehold: body.servingSizeHousehold || `${body.servingSizeG || 100}g`,
      caloriesKcal: body.caloriesKcal,
      totalFatG: body.totalFatG || 0,
      saturatedFatG: body.saturatedFatG || 0,
      transFatG: body.transFatG || 0,
      cholesterolMg: body.cholesterolMg || 0,
      sodiumMg: body.sodiumMg || 0,
      totalCarbohydrateG: body.totalCarbohydrateG || 0,
      dietaryFiberG: body.dietaryFiberG || 0,
      totalSugarsG: body.totalSugarsG || 0,
      addedSugarsG: body.addedSugarsG || 0,
      proteinG: body.proteinG || 0,
      vitaminDMcg: body.vitaminDMcg || 0,
      calciumMg: body.calciumMg || 0,
      ironMg: body.ironMg || 0,
      potassiumMg: body.potassiumMg || 0,
    };

    const result = calculateGlobalNutrition(normalizedInput);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error('[api/labels/nutrition-calculate] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error during nutrition conversion.'
      },
      { status: 500 }
    );
  }
}
