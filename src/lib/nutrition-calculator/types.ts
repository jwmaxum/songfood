import { ExportCountry } from '@/types/label';

export interface BaseNutritionInput {
  baseWeightG: number;            // 입력 기준 중량 (일반적으로 100g)
  servingSizeG: number;           // 1회 섭취참고량 (Serving Size, 예: 120g)
  servingSizeUnit?: string;       // 'g' | 'ml' | 'piece'
  servingSizeHousehold?: string;  // 가구당 단위 (예: "4 pieces (120g)")
  servingsPerContainer: number;   // 총 내용량당 제공 횟수 (예: 4)

  // 기본 영양 성분 (입력 기준 중량당 수치)
  caloriesKcal: number;
  totalFatG: number;
  saturatedFatG: number;
  transFatG?: number;
  cholesterolMg?: number;
  sodiumMg: number;
  totalCarbohydrateG: number;
  dietaryFiberG?: number;
  totalSugarsG: number;
  addedSugarsG?: number;
  proteinG: number;

  // 미량 영양소
  vitaminDMcg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
}

export interface USDailyValues {
  totalFat: number;       // 78g
  saturatedFat: number;   // 20g
  cholesterol: number;    // 300mg
  sodium: number;         // 2300mg
  totalCarb: number;      // 275g
  dietaryFiber: number;   // 28g
  addedSugars: number;    // 50g
  protein: number;        // 50g
  vitaminD: number;       // 20mcg
  calcium: number;        // 1300mg
  iron: number;           // 18mg
  potassium: number;      // 4700mg
}

export interface USNutritionOutput {
  servingSizeHousehold: string;
  servingsPerContainer: number;
  isDualColumn: boolean;
  perServing: {
    calories: number;
    totalFat: number;
    totalFatDV: number;
    saturatedFat: number;
    saturatedFatDV: number;
    transFat: number;
    cholesterol: number;
    cholesterolDV: number;
    sodium: number;
    sodiumDV: number;
    totalCarb: number;
    totalCarbDV: number;
    dietaryFiber: number;
    dietaryFiberDV: number;
    totalSugars: number;
    addedSugars: number;
    addedSugarsDV: number;
    protein: number;
    proteinDV: number;
    vitaminDMcg: number;
    vitaminDDV: number;
    calciumMg: number;
    calciumDV: number;
    ironMg: number;
    ironDV: number;
    potassiumMg: number;
    potassiumDV: number;
  };
  perContainer?: {
    calories: number;
    totalFat: number;
    totalFatDV: number;
    saturatedFat: number;
    saturatedFatDV: number;
    transFat: number;
    cholesterol: number;
    cholesterolDV: number;
    sodium: number;
    sodiumDV: number;
    totalCarb: number;
    totalCarbDV: number;
    dietaryFiber: number;
    dietaryFiberDV: number;
    totalSugars: number;
    addedSugars: number;
    addedSugarsDV: number;
    protein: number;
  };
}

export interface ChinaNutritionOutput {
  per100g: {
    energyKj: number;
    energyKcal: number;
    energyNRV: number;
    proteinG: number;
    proteinNRV: number;
    fatG: number;
    fatNRV: number;
    carbG: number;
    carbNRV: number;
    sodiumMg: number;
    sodiumNRV: number;
  };
}

export interface JapanNutritionOutput {
  perServing: {
    servingLabel: string;
    caloriesKcal: number;
    proteinG: number;
    fatG: number;
    carbG: number;
    sodiumMg: number;
    saltEquivalentG: number; // Na * 2.54 / 1000
  };
}

export interface EUNutritionOutput {
  per100g: {
    energyKj: number;
    energyKcal: number;
    fatG: number;
    saturatedFatG: number;
    carbG: number;
    sugarsG: number;
    proteinG: number;
    saltG: number;
    referenceIntakes: {
      energy: number;     // 8400 kJ / 2000 kcal
      fat: number;        // 70g
      saturates: number;  // 20g
      carbs: number;      // 260g
      sugars: number;     // 90g
      protein: number;    // 50g
      salt: number;       // 6g
    };
  };
}

export type TrafficLightRating = 'green' | 'amber' | 'red';

export interface UAENutritionOutput {
  per100g: {
    caloriesKcal: number;
    caloriesKj: number;
    fatG: number;
    saturatedFatG: number;
    sugarsG: number;
    saltG: number;
    trafficLights: {
      fat: { rating: TrafficLightRating; labelAr: string; labelEn: string };
      saturatedFat: { rating: TrafficLightRating; labelAr: string; labelEn: string };
      sugars: { rating: TrafficLightRating; labelAr: string; labelEn: string };
      salt: { rating: TrafficLightRating; labelAr: string; labelEn: string };
    };
  };
}

export interface GlobalNutritionResult {
  sourceWeightG: number;
  servingSizeG: number;
  US: USNutritionOutput;
  CN: ChinaNutritionOutput;
  JP: JapanNutritionOutput;
  EU: EUNutritionOutput;
  UAE: UAENutritionOutput;
}
