import ingredientsDbRaw from './dictionaries/food-ingredients-db.json';
import additivesDbRaw from './dictionaries/food-additives-db.json';
import { TargetCountry } from '@/types/label';

export interface IngredientTranslationItem {
  code: string;
  ko: string;
  en: string;
  cn: string;
  jp: string;
  ar: string;
  category?: string;
  isAllergenIn?: string[];
  bannedIn?: string[];
  eNumber?: string;
  insNumber?: string;
  warningNote?: string;
}

const ingredientsDb: IngredientTranslationItem[] = ingredientsDbRaw as IngredientTranslationItem[];
const additivesDb: IngredientTranslationItem[] = additivesDbRaw as IngredientTranslationItem[];

const allDictionaryItems: IngredientTranslationItem[] = [...ingredientsDb, ...additivesDb];

export interface TranslationResult {
  originalKo: string;
  translatedText: string;
  isAllergenInTarget: boolean;
  isBannedInTarget: boolean;
  bannedReason?: string;
  confidence: 'exact' | 'fuzzy' | 'untranslated';
  matchedCode?: string;
  eNumber?: string;
}

export interface BatchTranslationOutput {
  targetCountry: TargetCountry;
  items: TranslationResult[];
  formattedIngredientsText: string;
  detectedAllergens: string[];
  bannedIngredients: TranslationResult[];
  untranslatedCount: number;
}

/**
 * Clean and normalize Korean text for robust matching
 */
function normalizeKo(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '') // remove parenthetical notes for loose matching if needed
    .toLowerCase();
}

/**
 * Translate a single ingredient name into the target country's language
 */
export function translateIngredient(
  koName: string,
  targetCountry: TargetCountry
): TranslationResult {
  const trimmed = koName.trim();
  const normalized = normalizeKo(trimmed);

  // 1. Exact Match
  let match = allDictionaryItems.find(
    (item) => item.ko.trim() === trimmed || normalizeKo(item.ko) === normalized
  );

  // 2. Fuzzy / Substring Match if not found
  let confidence: 'exact' | 'fuzzy' | 'untranslated' = 'exact';
  if (!match) {
    match = allDictionaryItems.find(
      (item) =>
        normalized.includes(normalizeKo(item.ko)) ||
        normalizeKo(item.ko).includes(normalized)
    );
    if (match) {
      confidence = 'fuzzy';
    }
  }

  if (!match) {
    return {
      originalKo: koName,
      translatedText: koName,
      isAllergenInTarget: false,
      isBannedInTarget: false,
      confidence: 'untranslated',
    };
  }

  // Determine target language translation
  let translated = match.en;
  if (targetCountry === 'CN') {
    translated = match.cn;
  } else if (targetCountry === 'JP') {
    translated = match.jp;
  } else if (targetCountry === 'UAE') {
    translated = match.ar;
  } else if (targetCountry === 'EU') {
    translated = match.en; // Default EU label English or combined
  }

  const isAllergenInTarget =
    match.isAllergenIn?.includes(targetCountry) ?? false;
  const isBannedInTarget = match.bannedIn?.includes(targetCountry) ?? false;

  return {
    originalKo: koName,
    translatedText: translated,
    isAllergenInTarget,
    isBannedInTarget,
    bannedReason: isBannedInTarget ? match.warningNote : undefined,
    confidence,
    matchedCode: match.code,
    eNumber: match.eNumber,
  };
}

/**
 * Batch translate a list of ingredients and format them according to target country rules
 */
export function batchTranslateIngredients(
  ingredients: Array<{ name: string; percentage?: number; isAllergen?: boolean }>,
  targetCountry: TargetCountry
): BatchTranslationOutput {
  const items: TranslationResult[] = [];
  const detectedAllergens: string[] = [];
  const bannedIngredients: TranslationResult[] = [];
  let untranslatedCount = 0;

  for (const ing of ingredients) {
    const res = translateIngredient(ing.name, targetCountry);
    items.push(res);

    if (res.confidence === 'untranslated') {
      untranslatedCount++;
    }

    if (res.isAllergenInTarget || ing.isAllergen) {
      if (!detectedAllergens.includes(res.translatedText)) {
        detectedAllergens.push(res.translatedText);
      }
    }

    if (res.isBannedInTarget) {
      bannedIngredients.push(res);
    }
  }

  // Format ingredient text per target country regulatory customs
  // EU: allergens in BOLD (e.g. **WHEAT FLOUR**)
  // US: uppercase or standard title case
  // CN: comma separated with Chinese punctuation (，)
  // JP: Japanese comma (、)
  // UAE: Arabic comma (،)
  let formattedIngredientsText = '';
  if (targetCountry === 'EU') {
    formattedIngredientsText = items
      .map((item, idx) => {
        const pct = ingredients[idx]?.percentage
          ? ` (${ingredients[idx].percentage}%)`
          : '';
        const name = item.isAllergenInTarget
          ? item.translatedText.toUpperCase()
          : item.translatedText;
        return `${name}${pct}`;
      })
      .join(', ');
  } else if (targetCountry === 'CN') {
    formattedIngredientsText = items
      .map((item, idx) => {
        const pct = ingredients[idx]?.percentage
          ? `(${ingredients[idx].percentage}%)`
          : '';
        return `${item.translatedText}${pct}`;
      })
      .join('，');
  } else if (targetCountry === 'JP') {
    formattedIngredientsText = items
      .map((item, idx) => {
        const pct = ingredients[idx]?.percentage
          ? `(${ingredients[idx].percentage}%)`
          : '';
        return `${item.translatedText}${pct}`;
      })
      .join('、');
  } else if (targetCountry === 'UAE') {
    formattedIngredientsText = items
      .map((item, idx) => {
        const pct = ingredients[idx]?.percentage
          ? ` (${ingredients[idx].percentage}%)`
          : '';
        return `${item.translatedText}${pct}`;
      })
      .join('، ');
  } else {
    // US & General
    formattedIngredientsText = items
      .map((item, idx) => {
        const pct = ingredients[idx]?.percentage
          ? ` (${ingredients[idx].percentage}%)`
          : '';
        return `${item.translatedText}${pct}`;
      })
      .join(', ');
  }

  return {
    targetCountry,
    items,
    formattedIngredientsText,
    detectedAllergens,
    bannedIngredients,
    untranslatedCount,
  };
}

/**
 * Get all available dictionary entries for reference or autocomplete
 */
export function getAllDictionaryEntries(): IngredientTranslationItem[] {
  return allDictionaryItems;
}
