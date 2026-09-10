import { ExportCountry, FoodLabel, LabelIngredient, LabelNutrition } from '@/types/label';

export type RuleSeverity = 'critical' | 'warning' | 'info';

export interface RedFlagItem {
  code: string;
  field: string;
  severity: RuleSeverity;
  title: string;
  message: string;
  solution: string;
  lawReference?: string;
}

export interface ValidationInput {
  country: ExportCountry;
  productCategory?: string;
  hsCode?: string;
  productNameLocal: string;
  productNameEn?: string;
  netWeightG: number;
  netWeightOz?: number;
  packageAreaCm2?: number;
  isShelfStable?: boolean;
  claimsBadges?: string[];
  storageInstructions?: string;
  ingredients: LabelIngredient[];
  nutrition?: LabelNutrition;
  registrationNumbers?: {
    gaccCode?: string;
    fdaFce?: string;
    halalCertNo?: string;
    euEstablishmentNo?: string;
    japanImportNoticeNo?: string;
  };
  allergensDeclared?: string[];
  alcoholPercentage?: number;
  dateMarkingType?: string;
  dateMarkingText?: string;
  barcodeType?: string;
  barcodeNumber?: string;
  rawText?: string; // 소구 문구 또는 라벨 전문
}

export interface ValidationResult {
  country: ExportCountry;
  jurisdiction: string;
  isCompliant: boolean;
  score: number; // 0 ~ 100
  criticalErrors: RedFlagItem[];
  warnings: RedFlagItem[];
  infoNotes: RedFlagItem[];
  checkedAt: string;
}
