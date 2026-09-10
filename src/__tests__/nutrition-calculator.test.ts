import {
  convertToUSNutrition,
  convertToChinaNutrition,
  convertToJapanNutrition,
  convertToEUNutrition,
  convertToUAENutrition,
  calculateGlobalNutrition,
  BaseNutritionInput
} from '../lib/nutrition-calculator';

describe('영양성분 자동 산출 및 국가별 Nutrition Facts 변환 엔진', () => {

  const sampleMandu: BaseNutritionInput = {
    baseWeightG: 100,
    servingSizeG: 120, // 1회 제공량 120g (scale = 1.2)
    servingsPerContainer: 4,
    servingSizeHousehold: '4 pieces (120g)',
    caloriesKcal: 183,
    totalFatG: 5.0,
    saturatedFatG: 0.8,
    transFatG: 0.0,
    cholesterolMg: 12,
    sodiumMg: 383,
    totalCarbohydrateG: 26.6,
    dietaryFiberG: 1.7,
    totalSugarsG: 2.5,
    addedSugarsG: 0.8,
    proteinG: 7.5,
    vitaminDMcg: 0.0,
    calciumMg: 33.0,
    ironMg: 1.5,
    potassiumMg: 150.0,
  };

  test('1. 미국 FDA 2016 규격: 1회 제공량(120g) 스케일링, %DV 및 칼로리 반올림 검증', () => {
    const us = convertToUSNutrition(sampleMandu);

    // 183 * 1.2 = 219.6 kcal -> FDA 50kcal 이상 10단위 반올림 -> 220 kcal
    expect(us.perServing.calories).toBe(220);

    // 지방: 5.0 * 1.2 = 6.0g, %DV = (6.0 / 78) * 100 = 7.69% -> 8%
    expect(us.perServing.totalFat).toBe(6);
    expect(us.perServing.totalFatDV).toBe(8);

    // 나트륨: 383 * 1.2 = 459.6mg -> FDA 140mg 초과 10단위 반올림 -> 460mg, %DV = (459.6 / 2300) * 100 = 19.98% -> 20%
    expect(us.perServing.sodium).toBe(460);
    expect(us.perServing.sodiumDV).toBe(20);

    // 첨가당: 0.8 * 1.2 = 0.96g -> 1g, %DV = (0.96 / 50) * 100 = 1.92% -> 2%
    expect(us.perServing.addedSugars).toBe(1);
    expect(us.perServing.addedSugarsDV).toBe(2);

    expect(us.servingSizeHousehold).toBe('4 pieces (120g)');
  });

  test('2. 중국 GB 28050 규격: 100g 기준 에너지 kJ 환산 및 5대 의무 NRV% 검증', () => {
    const cn = convertToChinaNutrition(sampleMandu);

    // 183 kcal * 4.184 = 765.67 kJ -> 766 kJ
    expect(cn.per100g.energyKj).toBe(766);
    expect(cn.per100g.energyKcal).toBe(183);

    // 에너지 NRV% = (766 / 8400) * 100 = 9.1% -> 9%
    expect(cn.per100g.energyNRV).toBe(9);

    // 단백질: 7.5g, NRV% = (7.5 / 60) * 100 = 12.5% -> 13%
    expect(cn.per100g.proteinG).toBe(7.5);
    expect(cn.per100g.proteinNRV).toBe(13);

    // 나트륨: 383mg, NRV% = (383 / 2000) * 100 = 19.15% -> 19%
    expect(cn.per100g.sodiumMg).toBe(383);
    expect(cn.per100g.sodiumNRV).toBe(19);
  });

  test('3. 일본 소비자청 규격: 식염상당량 환산 공식 (Na * 2.54 / 1000) 정밀도 검증', () => {
    const jp = convertToJapanNutrition(sampleMandu);

    // 120g 제공량 나트륨: 383 * 1.2 = 459.6mg
    // 식염상당량: (459.6 * 2.54) / 1000 = 1.167g -> 1.17g
    expect(jp.perServing.saltEquivalentG).toBe(1.17);
    expect(jp.perServing.caloriesKcal).toBe(220);
    expect(jp.perServing.proteinG).toBe(9.0);
  });

  test('4. EU FIC 1169/2011 규격: 100g 기준 kJ/kcal 듀얼 표기 및 염분(Salt) 산출 검증', () => {
    const eu = convertToEUNutrition(sampleMandu);

    expect(eu.per100g.energyKcal).toBe(183);
    expect(eu.per100g.energyKj).toBe(766);

    // 염분(Salt): 383 * 2.5 / 1000 = 0.9575 -> 0.96g
    expect(eu.per100g.saltG).toBe(0.96);
    expect(eu.per100g.referenceIntakes.salt).toBe(16); // 0.96 / 6 * 100 = 16%
  });

  test('5. UAE GSO 규격: 100g당 4대 지표 신호등 라벨 (Traffic Light) 색상 등급 판정 검증', () => {
    const uae = convertToUAENutrition(sampleMandu);

    // 지방 5.0g (3.1~17.5g) -> amber (متوسط)
    expect(uae.per100g.trafficLights.fat.rating).toBe('amber');

    // 포화지방 0.8g (<= 1.5g) -> green (منخفض)
    expect(uae.per100g.trafficLights.saturatedFat.rating).toBe('green');

    // 당류 2.5g (<= 5.0g) -> green (منخفض)
    expect(uae.per100g.trafficLights.sugars.rating).toBe('green');

    // 염분 0.96g (0.31~1.5g) -> amber (متوسط)
    expect(uae.per100g.trafficLights.salt.rating).toBe('amber');
  });

  test('6. 통합 5개국 변환기: 단일 입력으로 5개국 규격 전체 동시 산출 성공', () => {
    const globalResult = calculateGlobalNutrition(sampleMandu);

    expect(globalResult.sourceWeightG).toBe(100);
    expect(globalResult.servingSizeG).toBe(120);
    expect(globalResult.US).toBeDefined();
    expect(globalResult.CN).toBeDefined();
    expect(globalResult.JP).toBeDefined();
    expect(globalResult.EU).toBeDefined();
    expect(globalResult.UAE).toBeDefined();
  });

});
