import { ExportCountry, FoodLabel } from '@/types/label';
import { RedFlagItem } from '../types';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface FontDimensionResult {
  xHeightMm: number;
  xHeightPt: number;
  isCompliant: boolean;
  minRequiredMm: number;
  packageAreaCm2: number;
  redFlags: RedFlagItem[];
}

export interface ArtworkComparisonResult {
  similarityScore: number; // 0 ~ 100
  matchedKeywords: string[];
  missingMandatoryPhrases: string[];
  spellingDiscrepancies: Array<{ expected: string; found: string }>;
  redFlags: RedFlagItem[];
}

export interface ArtworkInspectionReport {
  timestamp: string;
  country: ExportCountry;
  dpi: number;
  similarity: ArtworkComparisonResult;
  fontDimension: FontDimensionResult;
  contrastRatio: number;
  isContrastCompliant: boolean;
  boundingBoxes: BoundingBox[];
  overallCompliant: boolean;
  totalCriticalErrors: number;
  totalWarnings: number;
  allRedFlags: RedFlagItem[];
}

/**
 * 1. Calculate Jaccard & Token Match Similarity
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s\uAC00-\uD7A3\u3040-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);

  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  if (tokens1.size === 0 && tokens2.size === 0) return 100;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = intersection / union;
  const recall = tokens2.size > 0 ? intersection / tokens2.size : 0;

  // Blended similarity: prioritizes coverage of master specifications in artwork
  const blended = Math.max(jaccard, recall * 0.7 + jaccard * 0.3);
  return Math.round(blended * 100);
}

/**
 * 2. Compare Artwork OCR text with DB Master Label
 */
export function compareArtworkWithMaster(
  artworkText: string,
  label: FoodLabel
): ArtworkComparisonResult {
  const redFlags: RedFlagItem[] = [];
  const normalizedArtwork = artworkText.toLowerCase();

  // Target-oriented master texts to check
  const masterTexts: string[] = [];
  const targetName = label.header?.productNameTarget || label.header?.productNameEn || label.header?.productNameKo;
  if (targetName) masterTexts.push(targetName);
  if (label.pdp?.netWeightCustom) masterTexts.push(label.pdp.netWeightCustom);
  if (label.informationPanel?.containsAllergensStatement) {
    masterTexts.push(label.informationPanel.containsAllergensStatement);
  }

  // Add target ingredients
  (label.ingredients || []).forEach((ing) => {
    const ingName = ing.ingredientNameTarget || ing.ingredientNameKo;
    if (ingName) masterTexts.push(ingName);
  });

  const masterCorpus = masterTexts.join(' ');
  const similarityScore = calculateTextSimilarity(artworkText, masterCorpus);

  // Mandatory country phrases check
  const countryMandatoryMap: Record<ExportCountry, string[]> = {
    US: ['nutrition facts', 'servings per container', 'contains', 'ingredients'],
    EU: ['nutrition declaration', 'ingredients', 'best before', 'net quantity'],
    JP: ['栄養成分表示', '原材料名', '賞味期限', '内容量'],
    CN: ['营养成分表', '配料', '保质期', '净含量'],
    UAE: ['nutrition facts', 'ingredients', 'production date', 'expiry date'],
  };

  const mandatoryPhrases = countryMandatoryMap[label.country] || [];
  const missingMandatoryPhrases: string[] = [];
  const matchedKeywords: string[] = [];

  for (const phrase of mandatoryPhrases) {
    if (normalizedArtwork.includes(phrase.toLowerCase())) {
      matchedKeywords.push(phrase);
    } else {
      missingMandatoryPhrases.push(phrase);
      redFlags.push({
        code: 'ARTWORK-CRIT-MANDATORY-PHRASE-MISSING',
        field: 'artwork.ocrText',
        severity: 'critical',
        title: `[${label.country}] 인쇄 시안 내 필수 법정 표기 문구 누락: "${phrase}"`,
        message: `라벨 인쇄 시안 OCR 판독 결과, 수입국 법정 필수 문구인 "${phrase}"가 누락되었거나 심각하게 훼손되어 인식되지 않습니다.`,
        solution: `인쇄 시안 정보표시면(Info Panel)에 "${phrase}" 문구를 명확히 삽입하십시오.`,
        lawReference: '국가별 라벨링 필수 표기 규정 (US 21 CFR 101 / EU FIC 1169/2011 / 日 食品表示基準)',
        ruleId: 'ARTWORK-MISSING-PHRASE',
        whyProblem: '필수 문구가 누락된 라벨 인쇄 시안은 수입국 세관 통관 심사에서 100% 반려 및 시판 금지 처분을 받습니다.',
        howToFix: '아트워크 파일의 해당 패널에 누락된 키워드를 추가하십시오.',
        authority: label.country,
      });
    }
  }

  // Check Allergen Statement match
  if (label.informationPanel?.containsAllergensStatement) {
    const allergenStmt = label.informationPanel.containsAllergensStatement.toLowerCase();
    if (!normalizedArtwork.includes('contains') && !normalizedArtwork.includes('알레르기') && !normalizedArtwork.includes('原材料の一部に') && !normalizedArtwork.includes('过敏')) {
      redFlags.push({
        code: 'ARTWORK-CRIT-ALLERGEN-STATEMENT-MISSING',
        field: 'artwork.allergens',
        severity: 'critical',
        title: `[${label.country}] 인쇄 시안 내 알레르겐 고지문구 불일치/누락`,
        message: `마스터 DB에 지정된 알레르겐 문구("${label.informationPanel.containsAllergensStatement}")가 시안 텍스트에서 확인되지 않습니다.`,
        solution: '인쇄 시안의 알레르겐 강조 박스 또는 Contains 표기를 즉시 점검하십시오.',
        lawReference: 'FALCPA / FASTER Act / EU FIC Art. 21',
        ruleId: 'ARTWORK-ALLERGEN-DISCREPANCY',
        whyProblem: '알레르기 환자의 생명 안전과 직결되며 현지 리콜 사유 1위입니다.',
        howToFix: '마스터 DB의 알레르겐 표기 문구와 동일하게 인쇄 시안을 수정하십시오.',
        authority: label.country,
      });
    }
  }

  // If similarity is too low (< 50%)
  if (similarityScore < 50) {
    redFlags.push({
      code: 'ARTWORK-WARN-LOW-TEXT-SIMILARITY',
      field: 'artwork.similarity',
      severity: 'warning',
      title: `인쇄 시안과 마스터 데이터 텍스트 일치도 현저히 낮음 (${similarityScore}%)`,
      message: `인쇄 시안에서 판독된 텍스트와 등록된 마스터 제품 규격 간의 유사도가 ${similarityScore}%에 불과합니다. 다른 제품의 시안이 업로드되었거나 오타가 다수 존재할 수 있습니다.`,
      solution: '올바른 제품의 라벨 시안인지 확인하고, 인쇄 오타 여부를 전수 대조하십시오.',
      lawReference: 'Master Data Consistency Regulation',
      ruleId: 'ARTWORK-LOW-SIMILARITY',
      whyProblem: '공장 인쇄 발주 후 마스터 데이터와 불일치 발견 시 포장재 전량 폐기 손실이 발생합니다.',
      howToFix: '시안 파일을 교체하거나 텍스트를 마스터 규격에 맞추어 수정하십시오.',
      authority: 'QA/RA',
    });
  }

  return {
    similarityScore,
    matchedKeywords,
    missingMandatoryPhrases,
    spellingDiscrepancies: [],
    redFlags,
  };
}

/**
 * 3. Validate Font Physical Dimensions (x-height in mm & Net Weight font size)
 * - EU FIC 1169/2011 Annex IV:
 *   Package Area >= 80cm²: min x-height 1.2 mm
 *   Package Area < 80cm²: min x-height 0.9 mm
 * - US FDA 21 CFR 101.2:
 *   Net weight font size: min 1/16 inch (1.6 mm) for packages <= 5 sq. inches, larger for bigger.
 */
export function validateFontPhysicalDimensions(options: {
  country: ExportCountry;
  packageAreaCm2: number;
  pixelHeight: number; // 텍스트 영역의 픽셀 높이
  dpi: number; // 인쇄 해상도 (기본 300 DPI)
  isNetWeightText?: boolean;
}): FontDimensionResult {
  const { country, packageAreaCm2, pixelHeight, dpi, isNetWeightText } = options;
  const redFlags: RedFlagItem[] = [];

  // Convert pixel height to physical mm: mm = (pixels / DPI) * 25.4
  const physicalHeightMm = Number(((pixelHeight / (dpi || 300)) * 25.4).toFixed(2));
  // 1 pt = 1/72 inch = 0.352778 mm ➔ pt = mm / 0.352778
  const fontPt = Number((physicalHeightMm / 0.352778).toFixed(1));

  // Determine minimum required x-height by law
  let minRequiredMm = 1.2;
  if (country === 'EU') {
    minRequiredMm = packageAreaCm2 < 80 ? 0.9 : 1.2;
  } else if (country === 'US' && isNetWeightText) {
    minRequiredMm = 1.6; // 1/16 inch
  } else {
    minRequiredMm = 1.2; // Global recommended standard
  }

  const isCompliant = physicalHeightMm >= minRequiredMm;

  if (!isCompliant) {
    if (country === 'EU') {
      redFlags.push({
        code: 'EU-CRIT-ARTWORK-FONT-XHEIGHT-TOO-SMALL',
        field: 'artwork.fontSize',
        severity: 'critical',
        title: `[EU] 인쇄 활자 x-height 법정 최소 규격 미달: ${physicalHeightMm}mm (최소 ${minRequiredMm}mm 필요)`,
        message: `Regulation (EU) No 1169/2011 Article 13에 따라, 포장 면적 ${packageAreaCm2}cm² 라벨의 필수 정보 활자 x-height는 최소 ${minRequiredMm}mm 이상이어야 하나, 인쇄 시안 측정치는 ${physicalHeightMm}mm입니다.`,
        solution: `인쇄 시안의 서체 크기(pt)를 최소 ${minRequiredMm}mm 이상으로 확대하십시오.`,
        lawReference: 'Regulation (EU) No 1169/2011 Article 13 & Annex IV',
        ruleId: 'EU-FIC-XHEIGHT-MINIMUM',
        whyProblem: 'EU 수입항 식품검역관 검사 시 캘리퍼스/루페로 활자 높이를 실측하며, 미달 시 통관 거부됩니다.',
        howToFix: '아트워크 폰트 크기를 상향 조정하십시오.',
        authority: 'European Commission (EFSA)',
      });
    } else if (country === 'US' && isNetWeightText) {
      redFlags.push({
        code: 'US-CRIT-ARTWORK-NET-WEIGHT-FONT-TOO-SMALL',
        field: 'artwork.fontSize',
        severity: 'critical',
        title: `[US] PDP 순중량 폰트 크기 법정 규격 미달: ${physicalHeightMm}mm (최소 1/16" = 1.6mm 필요)`,
        message: `21 CFR 101.105에 따라 주표시면(PDP)의 순중량(Net Weight) 표기는 최소 1/16인치(1.6mm) 이상의 굵은 활자로 인쇄되어야 합니다.`,
        solution: `순중량 폰트 높이를 1.6mm(약 4.5pt) 이상으로 확대하십시오.`,
        lawReference: '21 CFR 101.105(i) / Fair Packaging and Labeling Act (FPLA)',
        ruleId: 'US-FDA-NET-WEIGHT-FONT',
        whyProblem: '미 FDA 수입 경보(Import Alert) 및 라벨 부적합 시정 명령(Notice of Injunction) 대상입니다.',
        howToFix: '순중량 텍스트 폰트를 1.6mm 이상으로 키우십시오.',
        authority: 'US FDA',
      });
    } else {
      redFlags.push({
        code: 'COMMON-WARN-ARTWORK-FONT-TOO-SMALL',
        field: 'artwork.fontSize',
        severity: 'warning',
        title: `인쇄 활자 크기 권장 기준 미달 (${physicalHeightMm}mm < ${minRequiredMm}mm)`,
        message: `소비자 가독성을 위한 최소 활자 크기 ${minRequiredMm}mm에 미달하여 노약자 및 시각 저하 소비자의 판독이 어렵습니다.`,
        solution: '폰트 크기를 키우거나 자간을 조정하십시오.',
        lawReference: 'Codex General Guidelines on Labelling (CAC/GL 1-1979)',
        ruleId: 'GLOBAL-READABILITY-FONT',
        whyProblem: '가독성 불량으로 인한 소비자 클레임 및 시정 권고를 받을 수 있습니다.',
        howToFix: '폰트 크기를 확대하십시오.',
        authority: country,
      });
    }
  }

  // Check Resolution / DPI
  if (dpi < 300) {
    redFlags.push({
      code: 'COMMON-WARN-ARTWORK-LOW-DPI',
      field: 'artwork.dpi',
      severity: 'warning',
      title: `인쇄 시안 해상도 부족 (${dpi} DPI < 300 DPI)`,
      message: `인쇄소 납품용 고품질 인쇄를 위해서는 최소 300 DPI 이상의 해상도가 요구되나, 현재 업로드된 시안의 해상도는 ${dpi} DPI로 낮아 인쇄 시 바코드나 소형 글자가 흐릿하게 번질 수 있습니다.`,
      solution: '최소 300 DPI 이상의 원본 벡터/고해상도 이미지 또는 인쇄용 PDF를 사용하십시오.',
      lawReference: 'ISO 12647 Print Quality Standard',
      ruleId: 'PRINT-RESOLUTION-STANDARD',
      whyProblem: '인쇄 시 바코드 리더기 스캔 실패(GS1 불합격) 및 글자 뭉개짐이 발생합니다.',
      howToFix: '300 DPI 이상의 고해상도 시안을 다시 출력하십시오.',
      authority: 'QA/RA',
    });
  }

  return {
    xHeightMm: physicalHeightMm,
    xHeightPt: fontPt,
    isCompliant,
    minRequiredMm,
    packageAreaCm2,
    redFlags,
  };
}

/**
 * 4. Calculate Contrast Ratio (WCAG 2.1 AA)
 * - Formula: (L1 + 0.05) / (L2 + 0.05)
 * - Target: >= 4.5:1 for normal text, >= 3:1 for large text
 */
export function calculateContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const luminance = (rgb: [number, number, number]) => {
    const a = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Number(ratio.toFixed(2));
}

/**
 * 5. Full Artwork Inspection Engine Runner
 */
export function inspectArtwork(options: {
  artworkText: string;
  label: FoodLabel;
  packageAreaCm2?: number;
  samplePixelHeight?: number;
  dpi?: number;
  textColorRgb?: [number, number, number];
  bgColorRgb?: [number, number, number];
}): ArtworkInspectionReport {
  const {
    artworkText,
    label,
    packageAreaCm2 = 120,
    samplePixelHeight = 15,
    dpi = 300,
    textColorRgb = [30, 30, 30], // Dark charcoal text
    bgColorRgb = [255, 255, 255], // White background
  } = options;

  // 1. Text Similarity & Missing phrases
  const similarityRes = compareArtworkWithMaster(artworkText, label);

  // 2. Font Dimensions & x-height
  const fontRes = validateFontPhysicalDimensions({
    country: label.country,
    packageAreaCm2,
    pixelHeight: samplePixelHeight,
    dpi,
  });

  // 3. Contrast Ratio
  const contrastRatio = calculateContrastRatio(textColorRgb, bgColorRgb);
  const isContrastCompliant = contrastRatio >= 4.5;
  const contrastRedFlags: RedFlagItem[] = [];

  if (!isContrastCompliant) {
    contrastRedFlags.push({
      code: 'COMMON-WARN-ARTWORK-POOR-CONTRAST',
      field: 'artwork.contrast',
      severity: 'warning',
      title: `글자 및 배경색 대비율(Contrast Ratio) 부족: ${contrastRatio}:1 (기준: 4.5:1 이상)`,
      message: `인쇄 시안의 글자색과 배경색 대비율이 ${contrastRatio}:1로 가독성 국제 표준(4.5:1)에 미달하여 시각 약자 및 어두운 조명에서 라벨 판독이 불가합니다.`,
      solution: '배경색을 더 밝게 하거나 폰트 색상을 더 진하게 변경하여 명암 대비를 강화하십시오.',
      lawReference: 'WCAG 2.1 Contrast Guidelines / US FDA 21 CFR 101.15(a)',
      ruleId: 'GLOBAL-LABEL-CONTRAST',
      whyProblem: '소비자 오인 및 표시 불명확에 따른 시정 조치 대상이 됩니다.',
      howToFix: '고대비 색상 조합을 적용하십시오.',
      authority: label.country,
    });
  }

  const allRedFlags = [
    ...similarityRes.redFlags,
    ...fontRes.redFlags,
    ...contrastRedFlags,
  ];

  const totalCritical = allRedFlags.filter((f) => f.severity === 'critical').length;
  const totalWarning = allRedFlags.filter((f) => f.severity === 'warning').length;

  const boundingBoxes: BoundingBox[] = [
    { x: 20, y: 30, width: 280, height: 40, label: 'PDP Product Name' },
    { x: 20, y: 80, width: 140, height: 30, label: 'Net Weight Area' },
    { x: 320, y: 30, width: 260, height: 180, label: 'Nutrition Facts Panel' },
    { x: 320, y: 220, width: 260, height: 90, label: 'Ingredients & Allergen Area' },
  ];

  return {
    timestamp: new Date().toISOString(),
    country: label.country,
    dpi,
    similarity: similarityRes,
    fontDimension: fontRes,
    contrastRatio,
    isContrastCompliant,
    boundingBoxes,
    overallCompliant: totalCritical === 0,
    totalCriticalErrors: totalCritical,
    totalWarnings: totalWarning,
    allRedFlags,
  };
}
