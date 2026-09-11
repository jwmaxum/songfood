import { ValidationInput, ValidationResult, RedFlagItem } from './types';
import { validateUSRules } from './rules/us-rules';
import { validateCNRules } from './rules/cn-rules';
import { validateJPRules } from './rules/jp-rules';
import { validateEURules } from './rules/eu-rules';
import { validateUAERules } from './rules/uae-rules';
import { resolveJurisdiction } from './jurisdiction-resolver';
import { run14DomainEngines } from './engines/domain-engines';

export * from './types';
export * from './allergens-registry';
export * from './jurisdiction-resolver';
export * from './engines';
export { getRulePack, RULE_PACKS } from '../../../rule_packs';
export type { RulePack, ComplianceRule } from '../../../rule_packs';

/**
 * 5대 수출 대상국 라벨 컴플라이언스 종합 검증 함수 (Phase 8 엔터프라이즈 통합 파이프라인)
 */
export function validateLabel(input: ValidationInput): ValidationResult {
  let critical: RedFlagItem[] = [];
  let warnings: RedFlagItem[] = [];
  let info: RedFlagItem[] = [];

  // 1. Jurisdiction Resolver 실행
  const jurisdictionInfo = resolveJurisdiction({
    country: input.country,
    productName: input.productNameLocal,
    categoryName: input.productCategory,
    ingredients: input.ingredients,
    netWeightG: input.netWeightG
  });

  // 수출 원천 금지 품목인 경우 (예: 미국 소고기 2% 초과, UAE 돼지고기 함유)
  if (jurisdictionInfo.isExportRestricted && jurisdictionInfo.restrictionReason) {
    critical.push({
      code: 'RESOLVER-CRIT-EXPORT-RESTRICTED',
      field: 'productCategory',
      severity: 'critical',
      title: `수출 금지/통관 보류 위험: ${jurisdictionInfo.primaryAuthority}`,
      message: jurisdictionInfo.restrictionReason,
      solution: '수입국 도축장 동등성 인정 품목 또는 식물성 대체 원료로 제품을 재개발하십시오.',
      lawReference: jurisdictionInfo.applicableLaws[0] || 'Trade Import Control Regulations',
      ruleId: 'JURISDICTION-RESTRICTION-BAN',
      whyProblem: '수입국 세관 및 농무부 검역소에서 입항 즉시 압류, 반송 또는 전량 소각 처분됩니다.',
      howToFix: '원재료 배합비를 재설계하여 제한 원료를 제거하십시오.',
      authority: jurisdictionInfo.primaryAuthority
    });
  }

  // 2. 14대 엔터프라이즈 도메인 특화 서브엔진 일괄 실행
  const domainOutput = run14DomainEngines(input);
  critical.push(...domainOutput.criticalErrors);
  warnings.push(...domainOutput.warnings);
  info.push(...domainOutput.infoNotes);

  // 3. 공통 원재료 배합비 합계 검증 (100% 검증)
  if (input.ingredients && input.ingredients.length > 0) {
    const totalRatio = input.ingredients.reduce((sum, ing) => sum + (ing.ratio || 0), 0);
    // 오차범위 98% ~ 102%
    if (totalRatio > 0 && (totalRatio < 98 || totalRatio > 102)) {
      warnings.push({
        code: 'COMMON-WARN-RATIO-SUM',
        field: 'ingredients',
        severity: 'warning',
        title: `원재료 배합비 합계 불일치 (현재: ${totalRatio.toFixed(1)}%)`,
        message: `원재료 배합비 합계가 100%에 근접하지 않습니다. 규제 기관 제출 시 배합비 합계는 100%이어야 합니다.`,
        solution: '원재료별 배합 비율을 재검토하여 합계 100%가 되도록 조정하십시오.',
        lawReference: 'CODEX General Standard for Labeling Section 4.2.1.2',
        ruleId: 'COMMON-RATIO-SUM-100',
        whyProblem: '배합비 합산 불일치는 인허가 서류 심사 시 즉각 반려 사유가 됩니다.',
        howToFix: '각 원료의 투입 비율을 재계산하여 총합 100%로 맞추십시오.',
        authority: jurisdictionInfo.primaryAuthority
      });
    }
  }

  // 4. 권역별 기존 정밀 규칙 엔진 통합
  switch (input.country) {
    case 'US': {
      const res = validateUSRules(input);
      critical.push(...res.critical);
      warnings.push(...res.warnings);
      info.push(...res.info);
      break;
    }
    case 'CN': {
      const res = validateCNRules(input);
      critical.push(...res.critical);
      warnings.push(...res.warnings);
      info.push(...res.info);
      break;
    }
    case 'JP': {
      const res = validateJPRules(input);
      critical.push(...res.critical);
      warnings.push(...res.warnings);
      info.push(...res.info);
      break;
    }
    case 'EU': {
      const res = validateEURules(input);
      critical.push(...res.critical);
      warnings.push(...res.warnings);
      info.push(...res.info);
      break;
    }
    case 'UAE': {
      const res = validateUAERules(input);
      critical.push(...res.critical);
      warnings.push(...res.warnings);
      info.push(...res.info);
      break;
    }
    default:
      break;
  }

  // 5. 중복 코드 에러 deduplication
  const deduplicate = (items: RedFlagItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.code}-${item.field}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  critical = deduplicate(critical);
  warnings = deduplicate(warnings);
  info = deduplicate(info);

  // 6. 누락된 메타데이터(whyProblem, howToFix, authority) 보충
  const enrichItem = (item: RedFlagItem) => {
    if (!item.whyProblem) item.whyProblem = item.message;
    if (!item.howToFix) item.howToFix = item.solution;
    if (!item.authority) item.authority = jurisdictionInfo.primaryAuthority;
    if (!item.ruleId) item.ruleId = item.code;
  };

  critical.forEach(enrichItem);
  warnings.forEach(enrichItem);
  info.forEach(enrichItem);

  // 7. 점수 산출 (기본 100점 - Critical당 30점 감점, Warning당 5점 감점)
  const penalty = critical.length * 30 + warnings.length * 5;
  const score = Math.max(0, 100 - penalty);
  const isCompliant = critical.length === 0;

  return {
    country: input.country,
    jurisdiction: jurisdictionInfo.primaryAuthority,
    jurisdictionInfo,
    isCompliant,
    score,
    criticalErrors: critical,
    warnings,
    infoNotes: info,
    subEngineReports: domainOutput.reports,
    checkedAt: new Date().toISOString()
  };
}

