import { ValidationInput, RedFlagItem } from '../types';

/**
 * Net Quantity & Legibility (x-height) Engine
 * - EU FIC 1169/2011 Article 13 & Annex IV:
 *   Minimum x-height of 1.2mm for food information.
 *   If largest packaging surface < 80 cm², minimum x-height is 0.9mm.
 * - US 21 CFR 101.105:
 *   Dual unit declaration mandatory (U.S. customary oz/lb AND metric g/kg) in lower 30% of PDP.
 * - JP: Font size >= 8pt (or 5.5pt if display surface < 150cm²).
 */
export function validateNetQuantity(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  const area = input.packageAreaCm2;
  const xHeight = input.fontXHeightMm;

  // 1. Minimum Font Size / x-height Verification (EU FIC Article 13)
  if (input.country === 'EU') {
    if (xHeight !== undefined && xHeight !== null) {
      if (area !== undefined && area < 80) {
        // Small package threshold (< 80 cm²) -> min x-height 0.9 mm
        if (xHeight < 0.9) {
          critical.push({
            code: 'EU-CRIT-FONT-XHEIGHT-SMALL',
            field: 'packageAreaCm2',
            severity: 'critical',
            title: `EU 법정 최소 폰트 크기(x-height) 미달 (소형 포장: ${xHeight}mm)`,
            message: `포장 표면적이 80cm² 미만인 경우 법정 최소 x-height는 0.9mm 이상이어야 하나, 현재 ${xHeight}mm로 미달합니다.`,
            solution: '라벨 필수 기재사항의 소문자 x 기준 높이를 0.9mm 이상으로 인쇄 사양을 변경하십시오.',
            lawReference: 'EU Regulation No 1169/2011 Article 13(3) & Annex IV',
            ruleId: 'EU-FONT-XHT-09',
            whyProblem: 'EU FIC는 가독성(Legibility) 위반 제품에 대해 현지 리콜 또는 유통 차단 명령을 내립니다.',
            howToFix: '인쇄판 폰트 크기(소문자 x 높이 기준)를 0.9mm 이상으로 확대하십시오.',
            authority: 'EC FIC'
          });
        }
      } else {
        // Standard package (>= 80 cm²) -> min x-height 1.2 mm
        if (xHeight < 1.2) {
          critical.push({
            code: 'EU-CRIT-FONT-XHEIGHT-STANDARD',
            field: 'packageAreaCm2',
            severity: 'critical',
            title: `EU 법정 최소 폰트 크기(x-height) 미달 (표준 포장: ${xHeight}mm)`,
            message: `포장 표면적이 80cm² 이상인 표준 규격의 법정 최소 x-height는 1.2mm 이상이어야 하나, 현재 ${xHeight}mm로 미달합니다.`,
            solution: '라벨 필수 기재사항의 소문자 x 기준 높이를 1.2mm 이상으로 조정하여 인쇄하십시오.',
            lawReference: 'EU Regulation No 1169/2011 Article 13(2) & Annex IV',
            ruleId: 'EU-FONT-XHT-12',
            whyProblem: '소비자 식별 불가(Inadequate Legibility) 판정 시 세관 통관 및 대형 유통사 입점이 거부됩니다.',
            howToFix: '포장 디자인의 서체 크기를 x-height 1.2mm 이상으로 상향 조절하십시오.',
            authority: 'EC FIC'
          });
        }
      }
    } else {
      info.push({
        code: 'EU-INFO-FONT-SPEC-CHECK',
        field: 'fontXHeightMm',
        severity: 'info',
        title: 'EU 법정 폰트 크기(x-height) 사양 확인 권장',
        message: '라벨 인쇄 데이터의 x-height가 1.2mm(표면적 80cm² 미만은 0.9mm) 이상인지 인쇄 감리 시 점검하십시오.',
        solution: '인쇄 시안 감리표에 x-height 측정값을 등록하십시오.',
        lawReference: 'EU FIC Article 13',
        ruleId: 'EU-FONT-SPEC-INFO',
        whyProblem: '유럽 검역소는 활자 크기 미달 라벨을 현장 시정명령 대상으로 분류합니다.',
        howToFix: '패키지 디자이너와 협의하여 x-height 기준을 충족시키십시오.',
        authority: 'EC FIC'
      });
    }
  }

  // 2. US Dual Declaration of Net Quantity (21 CFR 101.105)
  if (input.country === 'US') {
    const hasG = input.netWeightG > 0;
    const hasOz = input.netWeightOz !== undefined && input.netWeightOz > 0;

    if (hasG && !hasOz) {
      warnings.push({
        code: 'US-WARN-NET-DUAL-UNIT',
        field: 'netWeightOz',
        severity: 'warning',
        title: '미국 순중량 단위 단독 표기 주의 (Ounce 누락)',
        message: '미국 FDA 규정(21 CFR 101.105)상 순중량은 온스(oz/lb)와 그램(g/kg)을 병기(Dual Declaration)하여야 합니다.',
        solution: `순중량 표기를 "NET WT ${((input.netWeightG || 0) * 0.035274).toFixed(1)} OZ (${input.netWeightG}g)" 형태로 수정하십시오.`,
        lawReference: '21 CFR 101.105(j) / Fair Packaging and Labeling Act (FPLA)',
        ruleId: 'US-NET-WT-DUAL',
        whyProblem: '미국 소비재 포장 및 라벨링법(FPLA)에 따라 관할 기관 CBP/FDA 통관 심사 시 주요 지적 항목입니다.',
        howToFix: 'PDP 하단 30% 영역에 "NET WT ... OZ (... g)" 형식으로 수정하십시오.',
        authority: 'US FDA / CBP'
      });
    }
  }

  // 3. General Net Weight Zero / Negative Check
  if (!input.netWeightG || input.netWeightG <= 0) {
    critical.push({
      code: 'COMMON-CRIT-NET-WEIGHT-MISSING',
      field: 'netWeightG',
      severity: 'critical',
      title: '제품 내용량(Net Weight) 누락 또는 0g',
      message: '식품 라벨의 법정 필수 항목인 내용량(Net Quantity)이 입력되지 않았습니다.',
      solution: '정확한 제품 포장 내용량(g 또는 ml)을 입력하십시오.',
      lawReference: 'General Food Labeling Standards (CODEX STAN 1-1985)',
      ruleId: 'COMMON-NET-WT-REQ',
      whyProblem: '모든 국가의 식품 표시 기준상 내용량 미표기는 원초적 라벨 결격 사유입니다.',
      howToFix: '순중량을 정확히 측정하여 라벨 주표시면에 인쇄하십시오.',
      authority: 'Regulatory Authority'
    });
  }

  return { critical, warnings, info };
}
