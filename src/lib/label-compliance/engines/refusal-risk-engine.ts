import { ExportCountry, FoodLabel } from '@/types/label';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RefusalRiskDriver {
  code: string;
  category: 'INGREDIENT' | 'ALLERGEN' | 'REGISTRATION' | 'ADDITIVE' | 'CLAIM' | 'NUTRITION';
  title: string;
  scoreContribution: number;
  description: string;
  regulatorySource: string;
  precedentCase?: string;
  mitigationAction: string;
}

export interface RefusalRiskAssessment {
  productId: string;
  productName: string;
  country: ExportCountry;
  totalRiskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  riskDrivers: RefusalRiskDriver[];
  summary: string;
  clearanceProbability: number; // 0 - 100%
  evaluatedAt: string;
}

/**
 * Assess custom detention/refusal risk for a specific FoodLabel
 */
export function assessRefusalRisk(label: FoodLabel): RefusalRiskAssessment {
  const drivers: RefusalRiskDriver[] = [];
  let score = 0;

  const country = label.country;
  const ingredients = label.ingredients || [];
  const ingText = ingredients
    .map((i) => `${i.ingredientNameKo || ''} ${i.ingredientNameTarget || ''}`)
    .join(' ');
  const claims = [
    ...(label.claimsBadges || []),
    ...(label.pdp?.claimHighlights || []),
  ];
  const certs = [
    ...(label.pdp?.certifications || []),
    ...(label.claimsBadges || []),
  ];
  const productName =
    label.productNameEn ||
    label.header?.productNameKo ||
    label.productNameLocal ||
    label.header?.productNameEn ||
    label.productId;

  // 1. USA (FDA / USDA) Specific Risk Factors
  if (country === 'US') {
    // A. Meat content (USDA FSIS jurisdiction & BSE restrictions)
    const hasMeat = ingredients.some(
      (i) =>
        /소고기|돼지고기|beef|pork/i.test(`${i.ingredientNameKo} ${i.ingredientNameTarget}`) &&
        (i.ratio ?? 0) >= 2.0
    );
    if (hasMeat) {
      score += 50;
      drivers.push({
        code: 'US-RISK-USDA-MEAT',
        category: 'INGREDIENT',
        title: 'USDA FSIS 관할 소고기/돼지고기 2% 이상 함유',
        scoreContribution: 50,
        description:
          '미국은 한국산 우육/돈육 유래 가공품의 수입을 엄격히 제한하고 있으며, USDA-FSIS 동등성 인정 시설 미인증 시 항구 도착 즉시 반송/폐기됩니다.',
        regulatorySource: '9 CFR 327.2 & USDA FSIS Import Manual',
        precedentCase: '2024년 한국산 쇠고기 만두/볶음밥 LA 세관 수입 거부 및 전량 폐기 조치',
        mitigationAction: '미국 수출용 레시피를 식물성 대체육 또는 닭고기(USDA 승인 라인)로 대체',
      });
    }

    // B. Allergen Contains box missing
    const hasAllergens = ingredients.some((i) => i.isAllergen);
    const allergensStatement =
      label.informationPanel?.containsAllergensStatement ||
      (label as any).blocks?.infoPanel?.allergensText ||
      '';
    if (hasAllergens && !allergensStatement.toUpperCase().includes('CONTAINS')) {
      score += 35;
      drivers.push({
        code: 'US-RISK-ALLERGEN-CONTAINS',
        category: 'ALLERGEN',
        title: 'FALCPA / FASTER Act "CONTAINS" 박스 누락',
        scoreContribution: 35,
        description:
          '미국 FDA Import Refusal 통계상 40% 이상이 미신고 알레르겐 및 CONTAINS 박스 미기재로 인한 보류입니다.',
        regulatorySource: '21 U.S.C. 343(w) & FASTER Act 2023',
        precedentCase: '2023년 뉴욕항 한국산 스낵류 참깨(Sesame) 표기 누락으로 통관 보류(DWPE)',
        mitigationAction: '라벨 하단에 "CONTAINS: [ALLERGENS]" 독립 블록을 규격 폰트로 명시',
      });
    }
  }

  // 2. China (GACC / SAMR) Specific Risk Factors
  if (country === 'CN') {
    // A. GACC CIFER 18-digit registration missing
    const gaccNo =
      label.registrationNumbers?.gaccCode ||
      label.registrationNumbers?.gaccRegNo ||
      (label as any).blocks?.header?.gaccRegistrationNumber ||
      label.barcodeMarking?.registrationNumbers?.gaccRegNo;
    if (!gaccNo || gaccNo.trim().length < 10) {
      score += 40;
      drivers.push({
        code: 'CN-RISK-GACC-MISSING',
        category: 'REGISTRATION',
        title: '중국 해관총서(GACC) 해외제조업체 등록번호 미기재',
        scoreContribution: 40,
        description:
          '해관총서령 제248호에 따라 CIFER 등록번호 18자리 또는 한국 등록번호가 내외포장에 인쇄되지 않은 경우 양산항 입항 즉시 통관 거부됩니다.',
        regulatorySource: '중국 해관총서령 제248호 제15조',
        precedentCase: '2024년 칭다오항 한국산 라면 라벨 내 CIFER 등록번호 오타로 전량 반송',
        mitigationAction: '내외포장에 GACC 18자리 등록번호(예: CKOX2401...) 정확히 인쇄',
      });
    }

    // B. Zero-additive illegal marketing claim
    const marketingText = `${productName} ${claims.join(' ')}`;
    if (/零添加|不添加|0添加|无添加/i.test(marketingText)) {
      score += 30;
      drivers.push({
        code: 'CN-RISK-ZERO-ADDITIVE',
        category: 'CLAIM',
        title: 'GB 7718-2025 개정안 위반 무첨가(零添加) 마케팅 문구',
        scoreContribution: 30,
        description:
          '중국 시장감독관리총국(SAMR)의 개정 표준에 따라 기만적 무첨가 표현은 불법 표시로 간주되어 벌금 및 리콜 조치됩니다.',
        regulatorySource: 'GB 7718-2025 제4.1.4조',
        precedentCase: '2025년 상하이 세관 소스류 "0防腐剂" 표기 적발로 반송 처분',
        mitigationAction: '전면 라벨 및 홍보 문구에서 "零添加" 단어 완전 삭제',
      });
    }
  }

  // 3. Japan (CAA) Specific Risk Factors
  if (country === 'JP') {
    // A. Ambiguous allergen statement ("may contain")
    const allergenNote =
      label.informationPanel?.mayContainStatement ||
      (label as any).blocks?.infoPanel?.allergensText ||
      '';
    if (/들어 있을지도 모름|入っているかもしれない|入っている恐れ|かも/i.test(allergenNote)) {
      score += 30;
      drivers.push({
        code: 'JP-RISK-AMBIGUOUS-ALLERGEN',
        category: 'ALLERGEN',
        title: '일본 소비자청 추정성 알레르겐 표기 금지 규정 위반',
        scoreContribution: 30,
        description:
          '일본 식품표시법은 모호한 추정성 표기를 엄격히 금지하며 적발 시 즉각 판매정지 대상입니다.',
        regulatorySource: '일본 소비자청 식품표시법 Q&A 제7편',
        mitigationAction: '"본 제품은 [원료]를 사용한 시설에서 제조하고 있습니다" 공정 혼입 안내문으로 수정',
      });
    }
  }

  // 4. EU Specific Risk Factors
  if (country === 'EU') {
    // A. Banned E171 Titanium Dioxide
    const hasE171 = ingredients.some(
      (i) =>
        i.insOrENumber === 'E171' ||
        /이산화티타늄|이산화티탄|titanium dioxide|E171/i.test(
          `${i.ingredientNameKo} ${i.ingredientNameTarget}`
        )
    );
    if (hasE171) {
      score += 55;
      drivers.push({
        code: 'EU-RISK-BANNED-E171',
        category: 'ADDITIVE',
        title: 'EU 전면 금지 첨가물 이산화티타늄(E171) 검출 리스크',
        scoreContribution: 55,
        description:
          'Regulation (EU) 2022/63에 의해 EU 역내에서 식품 첨가물로 사용이 전면 금지되었으며, RASFF 신속 경보 1순위 적발 대상입니다.',
        regulatorySource: 'Regulation (EU) 2022/63',
        precedentCase: '2024년 독일 함부르크항 한국산 떡볶이 소스 E171 검출로 RASFF 통보 및 소각 폐기',
        mitigationAction: '백색 착색제를 칼슘카보네이트(E170) 또는 쌀가루 추출물로 즉각 배합 수정',
      });
    }
  }

  // 5. UAE Specific Risk Factors
  if (country === 'UAE') {
    // A. Haram ingredient (Pork / Lard)
    const hasPork = /돼지고기|돈지|포크|pork|lard|돼지|돈육/i.test(ingText);
    if (hasPork) {
      score += 70;
      drivers.push({
        code: 'UAE-RISK-HARAM-PORK',
        category: 'INGREDIENT',
        title: 'UAE 샤리아(이슬람법) 금지 하람(Haram) 돈육 성분 포함',
        scoreContribution: 70,
        description:
          '돼지고기 유래 원료는 비이슬람교도 구역 전용 특수 면허 없이는 일반 통관이 원천 차단되며 압류 처분됩니다.',
        regulatorySource: 'GSO 2055-1 / UAE.S 2055-1',
        mitigationAction: '중동 수출용 제품 라인에서 돈육 및 돈지 성분 100% 완전 배제',
      });
    }

    // B. Missing Halal cert when animal ingredients are present
    const hasAnimal = /소고기|닭고기|우유|계란|beef|chicken|gelatin/i.test(ingText);
    const hasHalalCert =
      certs.includes('Halal') || Boolean(label.registrationNumbers?.halalCertNo);
    if (hasAnimal && !hasHalalCert) {
      score += 35;
      drivers.push({
        code: 'UAE-RISK-NO-HALAL-CERT',
        category: 'REGISTRATION',
        title: '동물성 원료 함유 제품 MoIAT 공인 할랄 인증서 누락',
        scoreContribution: 35,
        description: '육류 및 동물성 원료 함유 식품의 할랄 인증서 미제출 시 두바이 세관 통관 거부',
        regulatorySource: 'UAE MoIAT Decision No. 10 of 2022',
        mitigationAction: 'KMF 또는 JAKIM 상호인정 할랄 인증서 발급 및 라벨에 할랄 마크 삽입',
      });
    }
  }

  // Cap total score to 0 - 100
  const totalRiskScore = Math.min(100, score);

  let riskLevel: RiskLevel = 'LOW';
  if (totalRiskScore >= 80) riskLevel = 'CRITICAL';
  else if (totalRiskScore >= 50) riskLevel = 'HIGH';
  else if (totalRiskScore >= 20) riskLevel = 'MODERATE';

  // Clearance probability estimation
  const clearanceProbability = Math.max(5, 100 - totalRiskScore);

  let summary = '';
  if (riskLevel === 'CRITICAL') {
    summary = '🔴 즉각 통관 거부(Detention) 및 폐기/반송 고위험: 세관 입항 전 필수적인 라벨/배합비 수정이 요구됩니다.';
  } else if (riskLevel === 'HIGH') {
    summary = '🟠 통관 보류 및 정밀 검사 위험: 과거 거부 사례가 빈번한 요인이 발견되어 사전 수정이 권고됩니다.';
  } else if (riskLevel === 'MODERATE') {
    summary = '🟡 통관 주의: 일부 보완이 권장되나 치명적 거부 리스크는 낮습니다.';
  } else {
    summary = '🟢 통관 안전: 과거 주요 거부 판례 및 고위험 요인이 감지되지 않아 신속 통관이 예상됩니다.';
  }

  return {
    productId: label.productId,
    productName,
    country,
    totalRiskScore,
    riskLevel,
    riskDrivers: drivers,
    summary,
    clearanceProbability,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Batch assess refusal risks for an entire product catalogue
 */
export function evaluateAllLabelsRisk(labels: FoodLabel[]): RefusalRiskAssessment[] {
  return labels.map((label) => assessRefusalRisk(label));
}
