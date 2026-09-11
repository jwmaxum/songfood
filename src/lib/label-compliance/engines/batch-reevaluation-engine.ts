import { FoodLabel, ExportCountry } from '@/types/label';
import { RedFlagItem } from '../types';
import { validateLabel } from '../index';
import { generateAutoFixPatches, LabelPatchItem } from './auto-fix-engine';

export interface BatchItemEvaluationResult {
  labelId: string;
  productId: string;
  productName: string;
  country: ExportCountry;
  previousStatus: string;
  newStatus: 'compliant' | 'warning' | 'rejected';
  score: number;
  criticalCount: number;
  warningCount: number;
  criticalErrors: RedFlagItem[];
  warnings: RedFlagItem[];
  isImpacted: boolean; // 기존 compliant 였으나 신규 위반 발생 여부
  availablePatches: LabelPatchItem[];
}

export interface BatchEvaluationReport {
  timestamp: string;
  rulePackVersion: string;
  totalLabelsEvaluated: number;
  totalImpactedLabels: number; // 새로 부적합으로 판정된 라벨
  fullyCompliantCount: number;
  warningCount: number;
  criticalRejectedCount: number;
  countryDistribution: Record<ExportCountry, { total: number; compliant: number; nonCompliant: number }>;
  topViolations: Array<{ code: string; title: string; count: number; severity: string }>;
  results: BatchItemEvaluationResult[];
}

/**
 * Run Batch Re-evaluation on an array of FoodLabels
 */
export function runBatchReevaluation(
  labels: FoodLabel[],
  options?: {
    rulePackVersion?: string;
  }
): BatchEvaluationReport {
  const version = options?.rulePackVersion || 'v2.4 (2026 Enterprise Edition)';
  const results: BatchItemEvaluationResult[] = [];
  const violationCountMap: Record<string, { title: string; count: number; severity: string }> = {};

  const countryDist: Record<ExportCountry, { total: number; compliant: number; nonCompliant: number }> = {
    US: { total: 0, compliant: 0, nonCompliant: 0 },
    CN: { total: 0, compliant: 0, nonCompliant: 0 },
    JP: { total: 0, compliant: 0, nonCompliant: 0 },
    EU: { total: 0, compliant: 0, nonCompliant: 0 },
    UAE: { total: 0, compliant: 0, nonCompliant: 0 },
  };

  for (const label of labels) {
    const country = label.country;
    if (countryDist[country]) {
      countryDist[country].total++;
    }

    // Convert FoodLabel to ValidationInput
    const valResult = validateLabel({
      country: label.country,
      productNameLocal: label.header?.productNameTarget || label.header?.productNameKo || '',
      productNameEn: label.header?.productNameEn,
      productCategory: label.header?.legalProductType,
      netWeightG: label.pdp?.netWeightG || 1000,
      claimsBadges: label.pdp?.claimHighlights || [],
      ingredients: (label.ingredients || []).map((ing) => ({
        ingredientNameKo: ing.ingredientNameKo,
        ingredientNameEn: ing.ingredientNameTarget,
        ratio: ing.ratio,
        isAllergen: ing.isAllergen,
        eNumber: ing.insOrENumber,
      })),
      nutrition: label.nutrition,
      storageInstructions: label.informationPanel?.storageConditionTarget,
      rawText: `${label.header?.productNameTarget || ''} ${label.pdp?.claimHighlights?.join(' ') || ''}`,
    });

    const isCompliant = valResult.isCompliant && valResult.criticalErrors.length === 0;
    const newStatus: 'compliant' | 'warning' | 'rejected' = isCompliant
      ? valResult.warnings.length > 0
        ? 'warning'
        : 'compliant'
      : 'rejected';

    if (isCompliant) {
      if (countryDist[country]) countryDist[country].compliant++;
    } else {
      if (countryDist[country]) countryDist[country].nonCompliant++;
    }

    // Check impact: was previously marked compliant, but now has critical or warning errors
    const wasCompliant = label.status === 'compliant';
    const isImpacted = wasCompliant && (!isCompliant || valResult.warnings.length > 0);

    // Track violations
    const allFlags = [...valResult.criticalErrors, ...valResult.warnings];
    for (const flag of allFlags) {
      if (!violationCountMap[flag.code]) {
        violationCountMap[flag.code] = {
          title: flag.title,
          count: 0,
          severity: flag.severity,
        };
      }
      violationCountMap[flag.code].count++;
    }

    // Generate auto-fix patches if any violations
    const patches = generateAutoFixPatches(label, allFlags);

    results.push({
      labelId: label.id || `lbl-${label.productId}-${label.country}`,
      productId: label.productId,
      productName: label.header?.productNameKo || label.productId,
      country: label.country,
      previousStatus: label.status || 'draft',
      newStatus,
      score: valResult.score,
      criticalCount: valResult.criticalErrors.length,
      warningCount: valResult.warnings.length,
      criticalErrors: valResult.criticalErrors,
      warnings: valResult.warnings,
      isImpacted,
      availablePatches: patches,
    });
  }

  // Calculate top violations
  const topViolations = Object.entries(violationCountMap)
    .map(([code, data]) => ({
      code,
      title: data.title,
      count: data.count,
      severity: data.severity,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const fullyCompliant = results.filter((r) => r.newStatus === 'compliant').length;
  const warningCount = results.filter((r) => r.newStatus === 'warning').length;
  const criticalRejected = results.filter((r) => r.newStatus === 'rejected').length;
  const totalImpacted = results.filter((r) => r.isImpacted).length;

  return {
    timestamp: new Date().toISOString(),
    rulePackVersion: version,
    totalLabelsEvaluated: labels.length,
    totalImpactedLabels: totalImpacted,
    fullyCompliantCount: fullyCompliant,
    warningCount,
    criticalRejectedCount: criticalRejected,
    countryDistribution: countryDist,
    topViolations,
    results,
  };
}
