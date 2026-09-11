import { ValidationInput, RedFlagItem, SubEngineReport } from '../types';
import { resolveProductScope, calculateMeatPercentages } from '../jurisdiction-resolver';
import { validateQuid } from './quid-engine';
import { validateAdditives } from './additive-engine';
import { validateNetQuantity } from './net-quantity-engine';
import { validateClaims } from './claim-engine';
import { validateAllergenSourcesEngine } from './allergen-source-engine';
import { validateBarcodeAndMarking } from './barcode-engine';
import {
  validateCompoundIngredients,
  validateProcessingAids,
  validateCountryOfOrigin,
} from './ingredient-intelligence-engine';
import { AllergenSourceItem, AllergenDeclarationAudit } from '@/types/allergen';
import { FoodLabel } from '@/types/label';

export interface DomainEnginesOutput {
  criticalErrors: RedFlagItem[];
  warnings: RedFlagItem[];
  infoNotes: RedFlagItem[];
  reports: SubEngineReport[];
  allergenSources?: AllergenSourceItem[];
  allergenAudit?: AllergenDeclarationAudit;
}

/**
 * 14대 엔터프라이즈 도메인 특화 컴플라이언스 엔진 통합 실행기
 */
export function run14DomainEngines(input: ValidationInput): DomainEnginesOutput {
  const criticalErrors: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const infoNotes: RedFlagItem[] = [];
  const reports: SubEngineReport[] = [];
  let detectedSources: AllergenSourceItem[] = [];
  let detectedAudit: AllergenDeclarationAudit | undefined = undefined;

  function recordIssues(
    engineId: string,
    engineName: string,
    res: { critical: RedFlagItem[]; warnings: RedFlagItem[]; info: RedFlagItem[] }
  ) {
    criticalErrors.push(...res.critical);
    warnings.push(...res.warnings);
    infoNotes.push(...res.info);

    const issuesCount = res.critical.length + res.warnings.length;
    reports.push({
      engineId,
      engineName,
      passed: res.critical.length === 0,
      issuesCount
    });
  }

  // 1. Product Scope Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];
    const scope = resolveProductScope(input.productCategory || '', input.productNameLocal, input.ingredients);
    const { redMeatPct, poultryPct, hasPork } = calculateMeatPercentages(input.ingredients);

    if (input.country === 'US' && (redMeatPct >= 2.0 || poultryPct >= 2.0)) {
      crit.push({
        code: 'ENG-SCOPE-US-MEAT-TRADE-BAN',
        field: 'productCategory',
        severity: 'critical',
        title: `USDA-FSIS 관할 육류 수입 규제 저촉 (육류 함량: ${(redMeatPct + poultryPct).toFixed(1)}%)`,
        message: '미국은 한국산 우육/돈육 등 가공식품에 대해 도축장 동등성 미체결로 수입을 원천 차단하고 있습니다.',
        solution: '식육 함량을 2.0% 미만으로 감량하거나 식물성 대체육으로 레시피를 변경하십시오.',
        lawReference: '9 CFR Part 317 / FMIA & PPIA Equivalence Rules',
        ruleId: 'US-SCOPE-MEAT-FSIS',
        whyProblem: '한국은 미국 FSIS 도축장 위생 동등성 협정 미체결 국가로 미국 세관(CBP) 통관 시 전량 압류 및 반송 조치됩니다.',
        howToFix: '원재료 배합비에서 우육/돈육 성분을 2% 미만으로 낮추거나 비건 대체육으로 전환하십시오.',
        authority: 'USDA-FSIS / US CBP'
      });
    }

    if (input.country === 'UAE' && hasPork) {
      crit.push({
        code: 'ENG-SCOPE-UAE-HARAM-PORK',
        field: 'ingredients',
        severity: 'critical',
        title: 'UAE/GCC 샤리아 율법 절대 금지 성분: 돼지고기(Pork/Lard)',
        message: '이슬람 샤리아 법률에 따라 돼지고기 및 돈지 원료는 일반 유통 식품 체인에 수입이 불가합니다.',
        solution: '돼지고기 성분을 전면 배제하고 소고기(할랄 인증) 또는 닭고기(할랄 인증)로 포뮬레이션을 변경하십시오.',
        lawReference: 'GSO 2055-1 Halal Requirements',
        ruleId: 'UAE-SCOPE-HARAM-PORK',
        whyProblem: '할랄 인증 획득 불가능 품목으로 통관 즉시 폐기 조치됩니다.',
        howToFix: '돼지고기 및 돈육 성분을 완전 제거하십시오.',
        authority: 'MoIAT / ESMA'
      });
    }

    recordIssues('engine-1-scope', '1. Product Scope Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 2. Identity & Name Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (!input.productNameLocal || input.productNameLocal.trim().length === 0) {
      crit.push({
        code: 'ENG-NAME-LOCAL-MISSING',
        field: 'productNameLocal',
        severity: 'critical',
        title: '현지어 제품명(Statement of Identity) 누락',
        message: '식품 라벨의 법정 필수 항목인 제품의 법적/관용적 명칭이 입력되지 않았습니다.',
        solution: '수출국 공용어로 된 명확한 제품명을 입력하십시오.',
        lawReference: 'General Labeling Provisions (CODEX STAN 1-1985 Section 4.1)',
        ruleId: 'GLOBAL-NAME-REQ',
        whyProblem: '제품명 누락은 전 세계 모든 식품 라벨링 규정에서 기본적인 결격 사유입니다.',
        howToFix: '수출국 공식 언어로 규정된 식품 명칭을 주표시면(PDP)에 표기하십시오.',
        authority: 'Regulatory Authority'
      });
    }

    recordIssues('engine-2-identity', '2. Identity & Name Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 3. Ingredient & Compound Engine (including QUID)
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (!input.ingredients || input.ingredients.length === 0) {
      crit.push({
        code: 'ENG-ING-LIST-EMPTY',
        field: 'ingredients',
        severity: 'critical',
        title: '원재료 목록(Ingredients List) 부재',
        message: '원재료 목록이 비어 있습니다. 배합비와 성분 목록을 등록해야 합니다.',
        solution: '식품의 모든 배합 원재료를 중량 순으로 입력하십시오.',
        lawReference: 'CODEX STAN 1-1985 Section 4.2',
        ruleId: 'GLOBAL-ING-LIST-REQ',
        whyProblem: '원재료 목록 미표기는 식품 안전성 판별 불가의 원인이 됩니다.',
        howToFix: '배합비 순으로 정렬된 원재료 목록을 작성하십시오.',
        authority: 'Regulatory Authority'
      });
    }

    // Run QUID checks
    const quidRes = validateQuid(input);
    crit.push(...quidRes.critical);
    warn.push(...quidRes.warnings);
    inf.push(...quidRes.info);

    // Run Compound Ingredients 5% Rule & Processing Aids checks (Phase 14)
    try {
      const dummyLabel: FoodLabel = {
        id: 'temp',
        productId: 'temp',
        country: input.country,
        version: 1,
        status: 'draft',
        ingredients: input.ingredients.map((ing) => ({
          ingredientNameKo: ing.ingredientNameKo,
          ingredientNameTarget: ing.ingredientNameEn || ing.ingredientNameKo,
          ratio: ing.ratio ?? 0,
          isAllergen: false,
          insOrENumber: ing.eNumber,
        })),
      };

      const compoundFlags = validateCompoundIngredients(dummyLabel, input.ingredients as any);
      for (const f of compoundFlags) {
        if (f.severity === 'critical') crit.push(f);
        else if (f.severity === 'warning') warn.push(f);
        else inf.push(f);
      }

      const procFlags = validateProcessingAids(dummyLabel, input.ingredients as any);
      for (const f of procFlags) {
        if (f.severity === 'critical') crit.push(f);
        else if (f.severity === 'warning') warn.push(f);
        else inf.push(f);
      }
    } catch (err) {
      // Non-blocking fallback
    }

    recordIssues('engine-3-ingredient-quid', '3. Ingredient & QUID Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 4. Allergen Sources Engine
  {
    const allergenResult = validateAllergenSourcesEngine(input);
    detectedSources = allergenResult.sources;
    detectedAudit = allergenResult.audit;

    const crit: RedFlagItem[] = [...allergenResult.critical];
    const warn: RedFlagItem[] = [...allergenResult.warnings];
    const inf: RedFlagItem[] = [...allergenResult.info];

    const rawLower = (input.rawText || '').toLowerCase();
    const hasContainsBox = rawLower.includes('contains:') || rawLower.includes('allergens:');

    // If allergensDeclared is missing AND no CONTAINS box exists in rawText for US
    if (input.country === 'US' && (!input.allergensDeclared || input.allergensDeclared.length === 0) && !hasContainsBox) {
      warn.push({
        code: 'ENG-ALLERGEN-US-CHECK',
        field: 'allergensDeclared',
        severity: 'warning',
        title: '미국 FALCPA/FASTER Act 알레르겐 점검 권고',
        message: '미국 수출 시 9대 필수 알레르겐(참깨 포함)에 대한 유무 표기("Contains: ...")가 정확한지 확인하십시오.',
        solution: '원재료 중 알레르기 유발물질을 점검하여 Contains 문구를 등록하십시오.',
        lawReference: 'FALCPA 2004 / FASTER Act 2021',
        ruleId: 'US-ALLERGEN-FASTER',
        whyProblem: '미국 FDA 식품 리콜 원인의 40% 이상이 미신고 알레르겐에 기인합니다.',
        howToFix: '알레르기 유발 성분을 전수 조사하여 라벨에 표기하십시오.',
        authority: 'US FDA'
      });
    }

    recordIssues('engine-4-allergen', '4. Allergen Sources Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 5. Nutrition Facts Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (!input.nutrition) {
      crit.push({
        code: 'ENG-NUTRI-MISSING',
        field: 'nutrition',
        severity: 'critical',
        title: '영양성분표(Nutrition Facts) 누락',
        message: '수출 대상국 규격의 영양성분 데이터가 누락되어 있습니다.',
        solution: '열량, 지방, 나트륨, 탄수화물, 단백질 등 필수 영양성분 수치를 등록하십시오.',
        lawReference: 'General Nutrition Labeling Guidelines',
        ruleId: 'GLOBAL-NUTRITION-REQ',
        whyProblem: '영양표시 면제 대상이 아닌 가공식품은 영양표시 누락 시 판매가 금지됩니다.',
        howToFix: '공인 시험성적서 기반의 100g 또는 1회 제공량당 영양성분을 입력하십시오.',
        authority: 'Regulatory Authority'
      });
    }

    recordIssues('engine-5-nutrition', '5. Nutrition Facts Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 6. Claim & Marketing Engine
  {
    const claimRes = validateClaims(input);
    recordIssues('engine-6-claim', '6. Claim & Marketing Engine', claimRes);
  }

  // 7. Date Marking Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (!input.dateMarkingType && !input.dateMarkingText) {
      inf.push({
        code: 'ENG-DATE-INFO-CHECK',
        field: 'dateMarkingType',
        severity: 'info',
        title: '소비기한/유통기한(Date Marking) 표기 권고',
        message: '제품의 소비기한 또는 상미기한 표기 방식(YYYY-MM-DD 또는 Best Before)을 사전에 확인하십시오.',
        solution: '수출국 기준 일자 표기(YYYY-MM-DD 또는 Best Before / Use By)를 등록하십시오.',
        lawReference: 'CODEX STAN 1-1985 Section 4.7',
        ruleId: 'GLOBAL-DATE-MARKING',
        whyProblem: '일자 표시 누락은 유통기한 경과 식품 유통 위험으로 통관 거부 조치됩니다.',
        howToFix: '소비기한 또는 유통기한 인쇄 위치와 표기 형식을 지정하십시오.',
        authority: 'Regulatory Authority'
      });
    }

    recordIssues('engine-7-date-marking', '7. Date Marking Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 8. Storage & Shelf-Life Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (!input.storageInstructions || input.storageInstructions.trim().length === 0) {
      inf.push({
        code: 'ENG-STORAGE-MISSING',
        field: 'storageInstructions',
        severity: 'info',
        title: '보관 방법(Storage Instructions) 기재 권고',
        message: '식품의 신선도 및 위생 유지를 위한 보관 방법(실온, 냉장, 냉동 보관 등) 기재를 권장합니다.',
        solution: '보관 조건(예: "Store in a cool, dry place" 또는 "Keep Frozen at -18°C")을 명시하십시오.',
        lawReference: 'CODEX STAN 1-1985 Section 4.8',
        ruleId: 'GLOBAL-STORAGE-REQ',
        whyProblem: '보관 방법 미흡으로 인한 식품 변질 사고 발생 시 제조물 책임 리스크가 가중됩니다.',
        howToFix: '제품 성상에 적합한 보관 조건을 라벨에 명시하십시오.',
        authority: 'Regulatory Authority'
      });
    }

    recordIssues('engine-8-storage', '8. Storage & Shelf-Life Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 9. Operator & Importer Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (input.country === 'CN') {
      const gacc = input.registrationNumbers?.gaccCode || input.registrationNumbers?.gaccRegNo;
      if (!gacc || gacc.trim().length !== 18) {
        crit.push({
          code: 'ENG-OPERATOR-CN-GACC18',
          field: 'registrationNumbers',
          severity: 'critical',
          title: '중국 해외 제조업체 등록번호(GACC 18자리) 누락 또는 자릿수 불일치',
          message: '해관총서령 제248호에 따라 수입식품의 안팎 포장에 18자리 GACC 등록번호 표기가 의무화되어 있습니다.',
          solution: 'CIFER 시스템에서 발급받은 18자리 등록번호(예: CKOR...)를 포장에 인쇄하십시오.',
          lawReference: 'GACC Decree No. 248 Article 15',
          ruleId: 'CN-GACC-18DIGIT',
          whyProblem: 'GACC 등록번호 미인쇄 제품은 중국 세관에서 입항 검사 불합격 및 반송 처리됩니다.',
          howToFix: '포장 표면에 GACC 18자리 제조업체 코드를 추가 인쇄하십시오.',
          authority: 'GACC (General Administration of Customs China)'
        });
      }
    }

    recordIssues('engine-9-operator', '9. Operator & Importer Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 10. Origin & Traceability Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    const rawLower = (input.rawText || '').toLowerCase();
    const hasOrigin = rawLower.includes('korea') || rawLower.includes('원산지') || rawLower.includes('한국') || rawLower.includes('korean');
    if (!hasOrigin) {
      inf.push({
        code: 'ENG-ORIGIN-MISSING',
        field: 'rawText',
        severity: 'info',
        title: '원산지 표기(Country of Origin) 확인 권고',
        message: '해외 통관 시 "Product of Korea" 또는 "Made in Korea" 원산지 증명이 필요합니다.',
        solution: '라벨 주표시면 또는 정보표시면에 "Product of Korea"를 표기하십시오.',
        lawReference: '19 U.S.C. 1304 / EU FIC Article 26',
        ruleId: 'GLOBAL-ORIGIN-REQ',
        whyProblem: '원산지 미표기 수입품은 관세청 수입 통관 시 시정 요구 또는 과태료가 부과될 수 있습니다.',
        howToFix: '라벨 하단에 "Product of Korea" 영문 표기를 명시하십시오.',
        authority: 'Customs Authorities'
      });
    }

    // Run Detailed Country of Origin (COOL) Engine (Phase 14)
    try {
      const hasOriginInfo =
        input.ingredients.some((ing: any) => ing.originCountry !== undefined || ing.origin !== undefined) ||
        Boolean(input.rawText && /産地|원산지|原料原産地|国産|韓国産/i.test(input.rawText));

      if (hasOriginInfo) {
        const dummyLabel: FoodLabel = {
          id: 'temp',
          productId: 'temp',
          country: input.country,
          version: 1,
          status: 'draft',
          ingredients: input.ingredients.map((ing: any) => ({
            ingredientNameKo: ing.ingredientNameKo,
            ingredientNameTarget: ing.ingredientNameEn || ing.ingredientNameKo,
            ratio: ing.ratio ?? 0,
            originCountry: ing.originCountry || ing.origin,
            isAllergen: false,
            insOrENumber: ing.eNumber,
          })),
        };

        const coolFlags = validateCountryOfOrigin(dummyLabel, input.ingredients as any);
        for (const f of coolFlags) {
          if (f.severity === 'critical') crit.push(f);
          else if (f.severity === 'warning') warn.push(f);
          else inf.push(f);
        }
      }
    } catch (err) {
      // Non-blocking fallback
    }

    recordIssues('engine-10-origin', '10. Origin & Traceability Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 11. Multilingual Language Engine
  {
    const crit: RedFlagItem[] = [];
    const warn: RedFlagItem[] = [];
    const inf: RedFlagItem[] = [];

    if (input.country === 'UAE') {
      const hasArabic = /[\u0600-\u06FF]/.test(input.productNameLocal || '') || /[\u0600-\u06FF]/.test(input.rawText || '');
      if (!hasArabic) {
        crit.push({
          code: 'ENG-LANG-UAE-ARABIC-REQ',
          field: 'productNameLocal',
          severity: 'critical',
          title: 'UAE/GCC 법정 필수 아랍어(Arabic) 표기 부재',
          message: 'GSO 9/2013에 따라 아랍어 라벨(제품명, 원재료, 영양성분)은 필수이며 우측에서 좌측(RTL)으로 읽혀야 합니다.',
          solution: '아랍어 병기 스티커 또는 인쇄판을 준비하십시오.',
          lawReference: 'GSO 9/2013 Section 5.1',
          ruleId: 'UAE-LANG-ARABIC-REQ',
          whyProblem: '아랍어 라벨 누락은 중동 지역 세관 즉각 통관 거부 사유입니다.',
          howToFix: '공인 번역된 아랍어 라벨을 부착하십시오.',
          authority: 'MoIAT / Dubai Municipality'
        });
      }
    }

    recordIssues('engine-11-language', '11. Multilingual Language Engine', { critical: crit, warnings: warn, info: inf });
  }

  // 12. Additive & E-Number Engine
  {
    const addRes = validateAdditives(input);
    recordIssues('engine-12-additive', '12. Additive & E-Number Engine', addRes);
  }

  // 13. Net Quantity & Font (x-height) Engine
  {
    const netRes = validateNetQuantity(input);
    recordIssues('engine-13-net-quantity', '13. Net Quantity & Font Engine', netRes);
  }

  // 14. Barcode & Marking Engine
  {
    const barcodeRes = validateBarcodeAndMarking(input);
    recordIssues('engine-14-barcode', '14. Barcode & Marking Engine', barcodeRes);
  }

  return {
    criticalErrors,
    warnings,
    infoNotes,
    reports,
    allergenSources: detectedSources,
    allergenAudit: detectedAudit,
  };
}
