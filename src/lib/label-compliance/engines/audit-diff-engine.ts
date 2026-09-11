import { FoodLabel } from '@/types/label';

export interface FieldDiff {
  path: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'added' | 'removed' | 'modified';
}

export interface AuditSignOff {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  signedBy?: string;
  signedAt?: string;
  department?: string;
  comments?: string;
  signatureHash?: string;
}

export interface LabelVersionAuditEntry {
  id: string;
  productId: string;
  version: string;
  country: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  department: string;
  reason: string;
  diffs: FieldDiff[];
  signOff: AuditSignOff;
}

/**
 * Compute detailed field-level diffs between two versions of FoodLabel
 */
export function computeLabelDiff(
  prev: Partial<FoodLabel> | null | undefined,
  current: Partial<FoodLabel>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  if (!prev) {
    return [
      {
        path: 'root',
        label: 'Initial Creation',
        oldValue: null,
        newValue: `Version ${current.version ?? '1.0.0'} created`,
        changeType: 'added',
      },
    ];
  }

  // 1. Header changes (productNameEn, productNameLocal, netWeightG, legalProductType)
  const prevName = prev.productNameEn || prev.header?.productNameKo || prev.productNameLocal;
  const currName = current.productNameEn || current.header?.productNameKo || current.productNameLocal;
  if (prevName !== currName) {
    diffs.push({
      path: 'header.productName',
      label: '제품명 (Product Name)',
      oldValue: prevName,
      newValue: currName,
      changeType: 'modified',
    });
  }

  if (prev.netWeightG !== current.netWeightG) {
    diffs.push({
      path: 'header.netWeightG',
      label: '순중량(g) (Net Weight)',
      oldValue: prev.netWeightG,
      newValue: current.netWeightG,
      changeType: 'modified',
    });
  }

  const prevLegalType = prev.header?.legalProductType || prev.productCategoryLocal;
  const currLegalType = current.header?.legalProductType || current.productCategoryLocal;
  if (prevLegalType !== currLegalType) {
    diffs.push({
      path: 'header.legalCategory',
      label: '법적 식품유형 (Legal Category)',
      oldValue: prevLegalType,
      newValue: currLegalType,
      changeType: 'modified',
    });
  }

  // 2. Nutrition diffs
  const prevNut = (prev.nutrition || {}) as Record<string, unknown>;
  const currNut = (current.nutrition || {}) as Record<string, unknown>;
  const nutKeys: string[] = [
    'servingSizeG',
    'servingsPerContainer',
    'caloriesKcal',
    'totalFatG',
    'saturatedFatG',
    'transFatG',
    'cholesterolMg',
    'sodiumMg',
    'totalCarbohydrateG',
    'dietaryFiberG',
    'totalSugarsG',
    'addedSugarsG',
    'proteinG',
  ];

  for (const key of nutKeys) {
    const pVal = prevNut[key];
    const cVal = currNut[key];
    if (pVal !== cVal && (pVal !== undefined || cVal !== undefined)) {
      diffs.push({
        path: `nutrition.${String(key)}`,
        label: `영양성분 - ${String(key)}`,
        oldValue: pVal ?? null,
        newValue: cVal ?? null,
        changeType: pVal === undefined ? 'added' : cVal === undefined ? 'removed' : 'modified',
      });
    }
  }

  // 3. PDP Marketing copy / Claims
  const prevClaims = prev.claimsBadges?.join(', ') || prev.pdp?.claimHighlights?.join(', ');
  const currClaims = current.claimsBadges?.join(', ') || current.pdp?.claimHighlights?.join(', ');
  if (prevClaims !== currClaims) {
    diffs.push({
      path: 'pdp.claimsBadges',
      label: '전면 소구 카피 & 클레임 (Claims Badges)',
      oldValue: prevClaims ?? null,
      newValue: currClaims ?? null,
      changeType: 'modified',
    });
  }

  // 4. Barcode
  const prevBarcode = prev.barcodeNumber || prev.barcodeMarking?.barcodeNumber;
  const currBarcode = current.barcodeNumber || current.barcodeMarking?.barcodeNumber;
  if (prevBarcode !== currBarcode) {
    diffs.push({
      path: 'barcode.barcodeNumber',
      label: '바코드 번호 (Barcode)',
      oldValue: prevBarcode ?? null,
      newValue: currBarcode ?? null,
      changeType: 'modified',
    });
  }

  // 5. Compliance status
  if (prev.status !== current.status) {
    diffs.push({
      path: 'status',
      label: '컴플라이언스 상태 (Compliance Status)',
      oldValue: prev.status,
      newValue: current.status,
      changeType: 'modified',
    });
  }

  return diffs;
}

/**
 * Generate a simulated SHA-256 digital signature hash for QA sign-off
 */
export function generateSignOffHash(
  entryId: string,
  authorId: string,
  timestamp: string,
  secretSalt = 'SONGFOOD-QA-AUDIT-2026'
): string {
  const payload = `${entryId}:${authorId}:${timestamp}:${secretSalt}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0xQA_${hex.toUpperCase()}_SIGN`;
}

/**
 * Helper to build an audit entry
 */
export function createAuditEntry(params: {
  id?: string;
  productId: string;
  version: string;
  country: string;
  authorId: string;
  authorName: string;
  department: string;
  reason: string;
  prevLabel?: Partial<FoodLabel> | null;
  currentLabel: Partial<FoodLabel>;
  signOffStatus?: 'draft' | 'submitted' | 'approved' | 'rejected';
  signedBy?: string;
  comments?: string;
}): LabelVersionAuditEntry {
  const id = params.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const diffs = computeLabelDiff(params.prevLabel, params.currentLabel);
  const status = params.signOffStatus || 'draft';

  const signOff: AuditSignOff = {
    status,
    signedBy: params.signedBy,
    signedAt: status === 'approved' ? timestamp : undefined,
    department: status === 'approved' ? '품질보증팀 (QA/RA)' : undefined,
    comments: params.comments,
    signatureHash:
      status === 'approved' && params.signedBy
        ? generateSignOffHash(id, params.signedBy, timestamp)
        : undefined,
  };

  return {
    id,
    productId: params.productId,
    version: params.version,
    country: params.country,
    timestamp,
    authorId: params.authorId,
    authorName: params.authorName,
    department: params.department,
    reason: params.reason,
    diffs,
    signOff,
  };
}
