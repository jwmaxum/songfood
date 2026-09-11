import { ExportCountry, FoodLabel, LabelIngredient, LabelNutrition } from '@/types/label';
import type { JurisdictionResolution } from './jurisdiction-resolver';

export type RuleSeverity = 'critical' | 'warning' | 'info';

export interface RedFlagItem {
  code: string;
  field: string;
  severity: RuleSeverity;
  title: string;
  message: string;
  solution: string;
  lawReference?: string;
  // Phase 8 Enterprise Sub-Engine Properties
  ruleId?: string;
  whyProblem?: string;
  howToFix?: string;
  authority?: string;
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
  fontXHeightMm?: number;
  isShelfStable?: boolean;
  claimsBadges?: string[];
  storageInstructions?: string;
  ingredients: Array<Partial<LabelIngredient> & {
    ingredientNameKo: string;
    ingredientNameEn?: string;
    ratio?: number;
    eNumber?: string;
  }>;
  nutrition?: Partial<LabelNutrition>;
  registrationNumbers?: {
    gaccCode?: string;
    gaccRegNo?: string;
    fdaFce?: string;
    fdaFacilityNo?: string;
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

export interface SubEngineReport {
  engineId: string;
  engineName: string;
  passed: boolean;
  issuesCount: number;
}

export interface ValidationResult {
  country: ExportCountry;
  jurisdiction: string;
  jurisdictionInfo?: JurisdictionResolution;
  isCompliant: boolean;
  score: number; // 0 ~ 100
  criticalErrors: RedFlagItem[];
  warnings: RedFlagItem[];
  infoNotes: RedFlagItem[];
  subEngineReports?: SubEngineReport[];
  checkedAt: string;
}

