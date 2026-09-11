import { FoodLabel, TargetCountry } from '@/types/label';

export interface LabelAuditEntry {
  id: string;
  labelId: string;
  productId: string;
  country: TargetCountry;
  version: number;
  changedBy: string; // user email or admin ID
  changedAt: string;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'AUTO_FIX';
  fieldDiffs: Record<string, { oldValue: any; newValue: any }>;
  summary: string;
}

// In-memory persistent audit trail store
const auditLogsStore: LabelAuditEntry[] = [];

/**
 * Compute diff between old and new food label
 */
export function computeLabelDiff(
  oldLabel: Partial<FoodLabel>,
  newLabel: Partial<FoodLabel>
): Record<string, { oldValue: any; newValue: any }> {
  const diffs: Record<string, { oldValue: any; newValue: any }> = {};

  const keysToCheck: (keyof FoodLabel)[] = [
    'status',
    'productNameLocal',
    'productNameEn',
    'netWeightG',
    'storageInstructions',
    'shelfLifeMonths',
    'barcodeNumber',
    'hsCode',
  ];

  for (const key of keysToCheck) {
    if (oldLabel[key] !== newLabel[key]) {
      diffs[key] = {
        oldValue: oldLabel[key],
        newValue: newLabel[key],
      };
    }
  }

  // Check informationPanel diffs
  if (oldLabel.informationPanel?.containsAllergensStatement !== newLabel.informationPanel?.containsAllergensStatement) {
    diffs['containsAllergensStatement'] = {
      oldValue: oldLabel.informationPanel?.containsAllergensStatement,
      newValue: newLabel.informationPanel?.containsAllergensStatement,
    };
  }

  if (oldLabel.informationPanel?.storageConditionTarget !== newLabel.informationPanel?.storageConditionTarget) {
    diffs['storageConditionTarget'] = {
      oldValue: oldLabel.informationPanel?.storageConditionTarget,
      newValue: newLabel.informationPanel?.storageConditionTarget,
    };
  }

  return diffs;
}

/**
 * Record an immutable audit log entry and increment label version
 */
export function recordAuditLog(params: {
  oldLabel: FoodLabel;
  newLabel: FoodLabel;
  changedBy: string;
  action?: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'AUTO_FIX';
  note?: string;
}): { updatedLabel: FoodLabel; auditEntry: LabelAuditEntry } {
  const { oldLabel, newLabel, changedBy, action = 'UPDATE', note } = params;

  const fieldDiffs = computeLabelDiff(oldLabel, newLabel);
  const nextVersion = (oldLabel.version || 1) + 1;

  const now = new Date().toISOString();
  const entryId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const auditEntry: LabelAuditEntry = {
    id: entryId,
    labelId: oldLabel.id,
    productId: oldLabel.productId,
    country: oldLabel.country as TargetCountry,
    version: nextVersion,
    changedBy,
    changedAt: now,
    action,
    fieldDiffs,
    summary: note || `Label ${oldLabel.productId} (${oldLabel.country}) updated to v${nextVersion}. ${Object.keys(fieldDiffs).length} fields modified.`,
  };

  auditLogsStore.unshift(auditEntry);

  const updatedLabel: FoodLabel = {
    ...newLabel,
    version: nextVersion,
    updatedAt: now,
  };

  return { updatedLabel, auditEntry };
}

/**
 * Retrieve audit history for a specific label or product
 */
export function getAuditLogs(filter?: { productId?: string; country?: TargetCountry }): LabelAuditEntry[] {
  if (!filter) return auditLogsStore;
  return auditLogsStore.filter((log) => {
    if (filter.productId && log.productId !== filter.productId) return false;
    if (filter.country && log.country !== filter.country) return false;
    return true;
  });
}
