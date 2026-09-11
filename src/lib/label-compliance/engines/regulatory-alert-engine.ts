import { ExportCountry, FoodLabel } from '@/types/label';

export interface RegulatoryAmendment {
  id: string;
  country: ExportCountry;
  authority: string;
  regulationName: string;
  effectiveDate: string; // YYYY-MM-DD
  announcementDate: string;
  title: string;
  summary: string;
  affectedFields: string[];
  actionRequired: string;
  severity: 'CRITICAL' | 'URGENT' | 'UPCOMING' | 'INFO';
  referenceUrl?: string;
}

export interface RegulatoryAlertItem {
  amendment: RegulatoryAmendment;
  daysRemaining: number;
  status: 'IN_FORCE' | 'D_30' | 'D_90' | 'UPCOMING' | 'FUTURE';
  affectedProductIds: string[];
}

/**
 * Global food regulatory amendments registry for the 5 key export jurisdictions
 */
export const REGULATORY_AMENDMENTS: RegulatoryAmendment[] = [
  {
    id: 'CN-GB7718-2025',
    country: 'CN',
    authority: 'NHC / SAMR',
    regulationName: 'GB 7718-2025 식품안전국가표준 예포장식품 라벨통칙',
    effectiveDate: '2025-06-01',
    announcementDate: '2024-03-12',
    title: 'GB 7718-2025 개정 - 무첨가/Zero(零添加) 문구 전면 금지 및 알레르겐 의무화',
    summary:
      '중국 예포장식품 라벨에 "零添加", "不添加", "0添加" 등 소비자를 오도하는 기만적 마케팅 문구의 표시가 전면 금지되며, 8대 알레르겐 표시가 권장에서 의무화로 격상됩니다.',
    affectedFields: ['statementOfIdentity', 'claims', 'allergens'],
    actionRequired: '중국향 모든 라벨에서 "零添加" 마케팅 카피 즉시 삭제 및 알레르겐 표기 점검',
    severity: 'CRITICAL',
  },
  {
    id: 'JP-CAA-CASHEW-2025',
    country: 'JP',
    authority: '소비자청 (CAA)',
    regulationName: '식품표시법 시행규칙 제37호 개정안',
    effectiveDate: '2025-04-01',
    announcementDate: '2024-03-28',
    title: '일본 8대 특정원재료에 캐슈넛(カシューナッツ) 법정 의무 알레르겐 승격',
    summary:
      '기존 권장 20종 품목이었던 캐슈넛이 호두에 이어 법정 8대 특정원재료(의무 표시 대상)로 공식 승격되었습니다. 경과조치 기한 도래 전 라벨 원재료란 개정이 필수적입니다.',
    affectedFields: ['allergens', 'ingredients'],
    actionRequired: '일본향 견과류 원료 함유 제품의 알레르겐 표기 및 교차오염 주의문구 개정',
    severity: 'CRITICAL',
  },
  {
    id: 'US-FDA-HEALTHY-2025',
    country: 'US',
    authority: 'US FDA',
    regulationName: '21 CFR 101.65 Nutrient Content Claims for "Healthy"',
    effectiveDate: '2025-09-01',
    announcementDate: '2024-01-15',
    title: '미국 FDA "Healthy" 클레임 기준 개편안 시행',
    summary:
      '전통적인 저지방 중심 기준에서 미국인을 위한 식생활 지침(DGA)과 부합하도록 첨가당(Added Sugars) 및 나트륨 상한 규제가 대폭 강화되고 식품군(Food Groups) 기여도가 필수화됩니다.',
    affectedFields: ['claims', 'nutrition.addedSugarsG', 'nutrition.sodiumMg'],
    actionRequired: '"Healthy" 강조 표시 제품의 첨가당(5% DV 이하) 및 나트륨 기준치 적합성 재검증',
    severity: 'URGENT',
  },
  {
    id: 'EU-PPWR-2026',
    country: 'EU',
    authority: 'European Commission',
    regulationName: 'Regulation on Packaging and Packaging Waste (PPWR)',
    effectiveDate: '2026-01-01',
    announcementDate: '2024-04-24',
    title: 'EU 포장재 및 포장폐기물 규정(PPWR) - 라벨 재질 및 Triman 조화 규격',
    summary:
      'EU 전역에 유통되는 모든 식품 포장재는 재활용성 등급(Recyclability Grade A~C) 평가를 통과해야 하며, 회원국별 상이했던 분리배출 픽토그램의 조화 기준이 적용됩니다.',
    affectedFields: ['recyclingSymbols', 'netWeightG'],
    actionRequired: '프랑스 Triman 및 독일/이탈리아 분리배출 심볼의 PPWR 조화 규격 검토',
    severity: 'UPCOMING',
  },
  {
    id: 'UAE-HALAL-GSO2055',
    country: 'UAE',
    authority: 'MoIAT / ESMA',
    regulationName: 'GSO 2055-1: Halal Food Requirements',
    effectiveDate: '2025-10-01',
    announcementDate: '2024-02-10',
    title: 'UAE/GCC 할랄 인증기관 MoIAT 정식 등록 및 QR 추적성 의무화',
    summary:
      'UAE로 수출되는 모든 동물성 유래 식품 및 가공식품은 MoIAT 등록 공인 인증기관의 할랄 마크 및 디지털 QR 추적 코드가 라벨 상에 물리적으로 인쇄되어야 합니다.',
    affectedFields: ['claimsBadges', 'registrationNumbers.halalCertNo'],
    actionRequired: 'MoIAT 공인 인증기관 인증서 갱신 및 라벨 내 QR 추적 코드 배치 확인',
    severity: 'CRITICAL',
  },
];

/**
 * Calculate D-day remaining and alert status relative to a target date
 */
export function calculateDaysRemaining(effectiveDateStr: string, currentDateStr?: string): number {
  const current = currentDateStr ? new Date(currentDateStr) : new Date();
  const effective = new Date(effectiveDateStr);

  const diffTime = effective.getTime() - current.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Map remaining days to alert status
 */
export function getAlertStatus(daysRemaining: number): RegulatoryAlertItem['status'] {
  if (daysRemaining <= 0) return 'IN_FORCE';
  if (daysRemaining <= 30) return 'D_30';
  if (daysRemaining <= 90) return 'D_90';
  if (daysRemaining <= 180) return 'UPCOMING';
  return 'FUTURE';
}

/**
 * Scan all registered labels to find which products are affected by each regulatory amendment
 */
export function matchAffectedProducts(
  amendment: RegulatoryAmendment,
  labels: FoodLabel[]
): string[] {
  const affectedIds: string[] = [];

  for (const label of labels) {
    if (label.country !== amendment.country) continue;

    let isAffected = false;

    // 1. Check CN GB 7718 Zero-additive claims
    if (amendment.id === 'CN-GB7718-2025') {
      const claims = [
        ...(label.claimsBadges || []),
        ...(label.pdp?.claimHighlights || []),
        label.productNameLocal || '',
      ].join(' ');
      if (/零添加|不添加|0添加|无添加/i.test(claims)) {
        isAffected = true;
      }
    }

    // 2. Check JP Cashew
    else if (amendment.id === 'JP-CAA-CASHEW-2025') {
      const ing = (label.ingredients || [])
        .map((i) => `${i.ingredientNameKo} ${i.ingredientNameTarget}`)
        .join(' ');
      if (/캐슈넛|cashew|カシューナッツ/i.test(ing)) {
        isAffected = true;
      }
    }

    // 3. Check US Healthy claim
    else if (amendment.id === 'US-FDA-HEALTHY-2025') {
      const claims = [...(label.claimsBadges || []), ...(label.pdp?.claimHighlights || [])];
      if (claims.some((c: string) => /healthy/i.test(c))) {
        isAffected = true;
      }
    }

    // 4. Check UAE Halal
    else if (amendment.id === 'UAE-HALAL-GSO2055') {
      const hasMeatOrAnimal = (label.ingredients || []).some((i) =>
        /소고기|돼지고기|닭고기|육류|beef|pork|chicken|gelatin/i.test(i.ingredientNameKo)
      );
      const hasCert =
        label.claimsBadges?.includes('Halal') ||
        label.pdp?.certifications?.includes('Halal') ||
        Boolean(label.registrationNumbers?.halalCertNo);
      if (hasMeatOrAnimal && !hasCert) {
        isAffected = true;
      }
    }

    // Default: If it matches country and has no explicit exclusions, flag as affected if it's general
    if (isAffected || (amendment.id === 'EU-PPWR-2026' && label.country === 'EU')) {
      affectedIds.push(label.productId);
    }
  }

  return Array.from(new Set(affectedIds));
}

/**
 * Compute the full active alerts report
 */
export function getActiveRegulatoryAlerts(
  labels: FoodLabel[] = [],
  currentDateStr?: string
): RegulatoryAlertItem[] {
  return REGULATORY_AMENDMENTS.map((amendment) => {
    const daysRemaining = calculateDaysRemaining(amendment.effectiveDate, currentDateStr);
    const status = getAlertStatus(daysRemaining);
    const affectedProductIds = matchAffectedProducts(amendment, labels);

    return {
      amendment,
      daysRemaining,
      status,
      affectedProductIds,
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}
