import { ValidationInput, ValidationResult, RedFlagItem } from './types';
import { validateUSRules } from './rules/us-rules';
import { validateCNRules } from './rules/cn-rules';
import { validateJPRules } from './rules/jp-rules';
import { validateEURules } from './rules/eu-rules';
import { validateUAERules } from './rules/uae-rules';

export * from './types';
export * from './allergens-registry';
export { getRulePack, RULE_PACKS } from '../../../rule_packs';
export type { RulePack, ComplianceRule } from '../../../rule_packs';

const JURISDICTIONS: Record<string, string> = {
  US: 'FDA / USDA-FSIS',
  CN: 'SAMR / GACC',
  JP: '消費者庁 (CAA)',
  EU: 'EFSA / EC FIC',
  UAE: 'MoIAT / GSO'
};

/**
 * 5대 수출 대상국 라벨 컴플라이언스 종합 검증 함수
 */
export function validateLabel(input: ValidationInput): ValidationResult {
  let critical: RedFlagItem[] = [];
  let warnings: RedFlagItem[] = [];
  let info: RedFlagItem[] = [];

  // 1. 공통 원재료 배합비 합계 검증 (100% 검증)
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
        solution: '원재료별 배합 비율을 재검토하여 합계 100%가 되도록 조정하십시오.'
      });
    }
  }

  // 2. 권역별 특화 룰 엔진 분기
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

  // 3. 점수 산출 (기본 100점 - Critical당 30점 감점, Warning당 5점 감점)
  const penalty = critical.length * 30 + warnings.length * 5;
  const score = Math.max(0, 100 - penalty);
  const isCompliant = critical.length === 0;

  return {
    country: input.country,
    jurisdiction: JURISDICTIONS[input.country] || 'Regulatory Authority',
    isCompliant,
    score,
    criticalErrors: critical,
    warnings,
    infoNotes: info,
    checkedAt: new Date().toISOString()
  };
}
