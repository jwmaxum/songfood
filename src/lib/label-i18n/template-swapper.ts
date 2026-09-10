import mandatoryPhrasesRaw from './dictionaries/mandatory-phrases.json';
import { TargetCountry } from '@/types/label';

export type StorageType = 'frozen' | 'refrigerated' | 'ambient';
export type CookingMethod = 'microwave' | 'panFry' | 'boil';
export type DatingPrefixType = 'bestBefore' | 'useBy' | 'mfgDate';

interface MandatoryPhrasesSchema {
  storage: Record<StorageType, Record<TargetCountry, string>>;
  allergenHeader: Record<TargetCountry, string>;
  allergenCrossContact: Record<TargetCountry, string>;
  cookingInstructions: Record<CookingMethod, Record<TargetCountry, string>>;
  datingPrefix: Record<DatingPrefixType, Record<TargetCountry, string>>;
  regulatoryDisclaimers: Record<TargetCountry, string>;
}

const phrases = mandatoryPhrasesRaw as MandatoryPhrasesSchema;

/**
 * Get regulatory storage condition text in target country language
 */
export function getStorageStatement(
  storageType: StorageType,
  targetCountry: TargetCountry
): string {
  return phrases.storage[storageType]?.[targetCountry] || '';
}

/**
 * Construct compliant allergen statement according to target country rules
 * e.g. US "CONTAINS: WHEAT, SOYBEANS.", CN "致敏原信息：含有小麦、大豆。"
 */
export function buildAllergenStatement(
  allergens: string[],
  crossContactTraces: string[] = [],
  targetCountry: TargetCountry
): { statement: string; crossContactStatement: string; fullBlock: string } {
  const headerTemplate = phrases.allergenHeader[targetCountry] || '{allergens}';
  const crossTemplate = phrases.allergenCrossContact[targetCountry] || '{traces}';

  let allergenJoined = '';
  let traceJoined = '';

  if (targetCountry === 'CN') {
    allergenJoined = allergens.join('、');
    traceJoined = crossContactTraces.join('、');
  } else if (targetCountry === 'JP') {
    allergenJoined = allergens.join('・');
    traceJoined = crossContactTraces.join('、');
  } else if (targetCountry === 'UAE') {
    allergenJoined = allergens.join(' و ');
    traceJoined = crossContactTraces.join(' و ');
  } else {
    // US & EU
    allergenJoined = allergens.join(', ');
    traceJoined = crossContactTraces.join(', ');
  }

  const statement = allergens.length > 0
    ? headerTemplate.replace('{allergens}', allergenJoined)
    : '';

  const crossContactStatement = crossContactTraces.length > 0
    ? crossTemplate.replace('{traces}', traceJoined)
    : '';

  const fullBlock = [statement, crossContactStatement]
    .filter(Boolean)
    .join(' ');

  return {
    statement,
    crossContactStatement,
    fullBlock,
  };
}

/**
 * Get cooking instruction text in target country language
 */
export function getCookingInstruction(
  method: CookingMethod,
  targetCountry: TargetCountry
): string {
  return phrases.cookingInstructions[method]?.[targetCountry] || '';
}

/**
 * Get date marking prefix in target country language
 */
export function getDatingPrefix(
  prefixType: DatingPrefixType,
  targetCountry: TargetCountry
): string {
  return phrases.datingPrefix[prefixType]?.[targetCountry] || '';
}

/**
 * Get country regulatory disclaimer
 */
export function getRegulatoryDisclaimer(targetCountry: TargetCountry): string {
  return phrases.regulatoryDisclaimers[targetCountry] || '';
}

/**
 * Swap an entire label package's boilerplate texts when switching target countries
 */
export function swapBoilerplateTexts(params: {
  storageType: StorageType;
  allergens: string[];
  crossContactTraces?: string[];
  cookingMethod?: CookingMethod;
  targetCountry: TargetCountry;
}) {
  const { storageType, allergens, crossContactTraces = [], cookingMethod = 'microwave', targetCountry } = params;

  return {
    storageStatement: getStorageStatement(storageType, targetCountry),
    allergenStatement: buildAllergenStatement(allergens, crossContactTraces, targetCountry),
    cookingInstruction: getCookingInstruction(cookingMethod, targetCountry),
    datingPrefixBestBefore: getDatingPrefix('bestBefore', targetCountry),
    regulatoryDisclaimer: getRegulatoryDisclaimer(targetCountry),
    isRtl: targetCountry === 'UAE',
  };
}
