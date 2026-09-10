import {
  BaseNutritionInput,
  USNutritionOutput,
  ChinaNutritionOutput,
  JapanNutritionOutput,
  EUNutritionOutput,
  UAENutritionOutput,
  GlobalNutritionResult,
  TrafficLightRating
} from './types';

// 소수점 자리수 반올림 헬퍼
function roundTo(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// 미 FDA 칼로리 반올림 (50kcal 이상은 10단위, 이하는 5단위)
function roundUSCalories(kcal: number): number {
  if (kcal < 5) return 0;
  if (kcal <= 50) return Math.round(kcal / 5) * 5;
  return Math.round(kcal / 10) * 10;
}

// 미 FDA 다량영양소 반올림 (5g 이상은 1g 단위, 0.5~5g은 0.5g 단위, 0.5g 미만은 0g)
function roundUSMacro(g: number): number {
  if (g < 0.5) return 0;
  if (g < 5) return Math.round(g * 2) / 2;
  return Math.round(g);
}

// 미 FDA 나트륨 반올림 (140mg 초과는 10mg 단위, 5~140mg은 5mg 단위)
function roundUSSodium(mg: number): number {
  if (mg < 5) return 0;
  if (mg <= 140) return Math.round(mg / 5) * 5;
  return Math.round(mg / 10) * 10;
}

// 1. 미국 FDA 2016 변환기
export function convertToUSNutrition(input: BaseNutritionInput): USNutritionOutput {
  const scale = input.servingSizeG / input.baseWeightG;
  const containerScale = (input.servingSizeG * input.servingsPerContainer) / input.baseWeightG;

  const perServingRaw = {
    calories: input.caloriesKcal * scale,
    totalFat: input.totalFatG * scale,
    saturatedFat: input.saturatedFatG * scale,
    transFat: (input.transFatG ?? 0) * scale,
    cholesterol: (input.cholesterolMg ?? 0) * scale,
    sodium: input.sodiumMg * scale,
    totalCarb: input.totalCarbohydrateG * scale,
    dietaryFiber: (input.dietaryFiberG ?? 0) * scale,
    totalSugars: input.totalSugarsG * scale,
    addedSugars: (input.addedSugarsG ?? 0) * scale,
    protein: input.proteinG * scale,
    vitaminD: (input.vitaminDMcg ?? 0) * scale,
    calcium: (input.calciumMg ?? 0) * scale,
    iron: (input.ironMg ?? 0) * scale,
    potassium: (input.potassiumMg ?? 0) * scale,
  };

  const isDualColumn = input.servingsPerContainer >= 2 && input.servingsPerContainer <= 3;

  return {
    servingSizeHousehold: input.servingSizeHousehold || `${input.servingSizeG}g`,
    servingsPerContainer: input.servingsPerContainer,
    isDualColumn,
    perServing: {
      calories: roundUSCalories(perServingRaw.calories),
      totalFat: roundUSMacro(perServingRaw.totalFat),
      totalFatDV: Math.round((perServingRaw.totalFat / 78) * 100),
      saturatedFat: roundUSMacro(perServingRaw.saturatedFat),
      saturatedFatDV: Math.round((perServingRaw.saturatedFat / 20) * 100),
      transFat: roundUSMacro(perServingRaw.transFat),
      cholesterol: Math.round(perServingRaw.cholesterol),
      cholesterolDV: Math.round((perServingRaw.cholesterol / 300) * 100),
      sodium: roundUSSodium(perServingRaw.sodium),
      sodiumDV: Math.round((perServingRaw.sodium / 2300) * 100),
      totalCarb: roundUSMacro(perServingRaw.totalCarb),
      totalCarbDV: Math.round((perServingRaw.totalCarb / 275) * 100),
      dietaryFiber: roundUSMacro(perServingRaw.dietaryFiber),
      dietaryFiberDV: Math.round((perServingRaw.dietaryFiber / 28) * 100),
      totalSugars: roundUSMacro(perServingRaw.totalSugars),
      addedSugars: roundUSMacro(perServingRaw.addedSugars),
      addedSugarsDV: Math.round((perServingRaw.addedSugars / 50) * 100),
      protein: Math.round(perServingRaw.protein),
      proteinDV: Math.round((perServingRaw.protein / 50) * 100),
      vitaminDMcg: roundTo(perServingRaw.vitaminD, 1),
      vitaminDDV: Math.round((perServingRaw.vitaminD / 20) * 100),
      calciumMg: Math.round(perServingRaw.calcium),
      calciumDV: Math.round((perServingRaw.calcium / 1300) * 100),
      ironMg: roundTo(perServingRaw.iron, 1),
      ironDV: Math.round((perServingRaw.iron / 18) * 100),
      potassiumMg: Math.round(perServingRaw.potassium),
      potassiumDV: Math.round((perServingRaw.potassium / 4700) * 100),
    },
    perContainer: isDualColumn ? {
      calories: roundUSCalories(input.caloriesKcal * containerScale),
      totalFat: roundUSMacro(input.totalFatG * containerScale),
      totalFatDV: Math.round(((input.totalFatG * containerScale) / 78) * 100),
      saturatedFat: roundUSMacro(input.saturatedFatG * containerScale),
      saturatedFatDV: Math.round(((input.saturatedFatG * containerScale) / 20) * 100),
      transFat: roundUSMacro((input.transFatG ?? 0) * containerScale),
      cholesterol: Math.round((input.cholesterolMg ?? 0) * containerScale),
      cholesterolDV: Math.round((((input.cholesterolMg ?? 0) * containerScale) / 300) * 100),
      sodium: roundUSSodium(input.sodiumMg * containerScale),
      sodiumDV: Math.round(((input.sodiumMg * containerScale) / 2300) * 100),
      totalCarb: roundUSMacro(input.totalCarbohydrateG * containerScale),
      totalCarbDV: Math.round(((input.totalCarbohydrateG * containerScale) / 275) * 100),
      dietaryFiber: roundUSMacro((input.dietaryFiberG ?? 0) * containerScale),
      dietaryFiberDV: Math.round((((input.dietaryFiberG ?? 0) * containerScale) / 28) * 100),
      totalSugars: roundUSMacro(input.totalSugarsG * containerScale),
      addedSugars: roundUSMacro((input.addedSugarsG ?? 0) * containerScale),
      addedSugarsDV: Math.round((((input.addedSugarsG ?? 0) * containerScale) / 50) * 100),
      protein: Math.round(input.proteinG * containerScale),
    } : undefined
  };
}

// 2. 중국 GB 28050 변환기 (100g당 기준)
export function convertToChinaNutrition(input: BaseNutritionInput): ChinaNutritionOutput {
  const scale = 100 / input.baseWeightG;
  const cal100g = input.caloriesKcal * scale;
  const energyKj = Math.round(cal100g * 4.184);

  const protein100g = roundTo(input.proteinG * scale, 1);
  const fat100g = roundTo(input.totalFatG * scale, 1);
  const carb100g = roundTo(input.totalCarbohydrateG * scale, 1);
  const sodium100g = Math.round(input.sodiumMg * scale);

  // 중국 NRV: 에너지 8400kJ, 단백질 60g, 지방 60g, 탄수화물 300g, 나트륨 2000mg
  return {
    per100g: {
      energyKj,
      energyKcal: Math.round(cal100g),
      energyNRV: Math.round((energyKj / 8400) * 100),
      proteinG: protein100g,
      proteinNRV: Math.round((protein100g / 60) * 100),
      fatG: fat100g,
      fatNRV: Math.round((fat100g / 60) * 100),
      carbG: carb100g,
      carbNRV: Math.round((carb100g / 300) * 100),
      sodiumMg: sodium100g,
      sodiumNRV: Math.round((sodium100g / 2000) * 100),
    }
  };
}

// 3. 일본 소비자청 변환기 (1회 제공량당 기준 및 식염상당량 계산)
export function convertToJapanNutrition(input: BaseNutritionInput): JapanNutritionOutput {
  const scale = input.servingSizeG / input.baseWeightG;
  const sodiumServing = input.sodiumMg * scale;
  const saltEquivalent = roundTo((sodiumServing * 2.54) / 1000, 2);

  return {
    perServing: {
      servingLabel: input.servingSizeHousehold || `${input.servingSizeG}g当たり`,
      caloriesKcal: Math.round(input.caloriesKcal * scale),
      proteinG: roundTo(input.proteinG * scale, 1),
      fatG: roundTo(input.totalFatG * scale, 1),
      carbG: roundTo(input.totalCarbohydrateG * scale, 1),
      sodiumMg: Math.round(sodiumServing),
      saltEquivalentG: saltEquivalent,
    }
  };
}

// 4. EU FIC 1169/2011 변환기 (100g당 기준, kJ/kcal 듀얼)
export function convertToEUNutrition(input: BaseNutritionInput): EUNutritionOutput {
  const scale = 100 / input.baseWeightG;
  const cal100g = Math.round(input.caloriesKcal * scale);
  const kj100g = Math.round(cal100g * 4.184);
  const sodium100g = input.sodiumMg * scale;
  const salt100g = roundTo((sodium100g * 2.5) / 1000, 2);

  return {
    per100g: {
      energyKj: kj100g,
      energyKcal: cal100g,
      fatG: roundTo(input.totalFatG * scale, 1),
      saturatedFatG: roundTo(input.saturatedFatG * scale, 1),
      carbG: roundTo(input.totalCarbohydrateG * scale, 1),
      sugarsG: roundTo(input.totalSugarsG * scale, 1),
      proteinG: roundTo(input.proteinG * scale, 1),
      saltG: salt100g,
      referenceIntakes: {
        energy: Math.round((kj100g / 8400) * 100),
        fat: Math.round(((input.totalFatG * scale) / 70) * 100),
        saturates: Math.round(((input.saturatedFatG * scale) / 20) * 100),
        carbs: Math.round(((input.totalCarbohydrateG * scale) / 260) * 100),
        sugars: Math.round(((input.totalSugarsG * scale) / 90) * 100),
        protein: Math.round(((input.proteinG * scale) / 50) * 100),
        salt: Math.round((salt100g / 6) * 100),
      }
    }
  };
}

// 5. UAE GSO 신호등 라벨 판정
function getTrafficLight(value: number, greenLimit: number, amberLimit: number): { rating: TrafficLightRating; labelAr: string; labelEn: string } {
  if (value <= greenLimit) {
    return { rating: 'green', labelAr: 'منخفض', labelEn: 'LOW' };
  }
  if (value <= amberLimit) {
    return { rating: 'amber', labelAr: 'متوسط', labelEn: 'MED' };
  }
  return { rating: 'red', labelAr: 'عالي', labelEn: 'HIGH' };
}

export function convertToUAENutrition(input: BaseNutritionInput): UAENutritionOutput {
  const scale = 100 / input.baseWeightG;
  const cal100g = Math.round(input.caloriesKcal * scale);
  const kj100g = Math.round(cal100g * 4.184);

  const fat100g = roundTo(input.totalFatG * scale, 1);
  const satFat100g = roundTo(input.saturatedFatG * scale, 1);
  const sugars100g = roundTo(input.totalSugarsG * scale, 1);
  const salt100g = roundTo(((input.sodiumMg * scale) * 2.5) / 1000, 2);

  return {
    per100g: {
      caloriesKcal: cal100g,
      caloriesKj: kj100g,
      fatG: fat100g,
      saturatedFatG: satFat100g,
      sugarsG: sugars100g,
      saltG: salt100g,
      trafficLights: {
        fat: getTrafficLight(fat100g, 3.0, 17.5),
        saturatedFat: getTrafficLight(satFat100g, 1.5, 5.0),
        sugars: getTrafficLight(sugars100g, 5.0, 22.5),
        salt: getTrafficLight(salt100g, 0.3, 1.5),
      }
    }
  };
}

// 6. 통합 5개국 동시 변환기
export function calculateGlobalNutrition(input: BaseNutritionInput): GlobalNutritionResult {
  return {
    sourceWeightG: input.baseWeightG,
    servingSizeG: input.servingSizeG,
    US: convertToUSNutrition(input),
    CN: convertToChinaNutrition(input),
    JP: convertToJapanNutrition(input),
    EU: convertToEUNutrition(input),
    UAE: convertToUAENutrition(input),
  };
}
