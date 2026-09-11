import { ValidationInput, RedFlagItem } from '../types';
import { AllergenSourceItem, AllergenDeclarationAudit } from '@/types/allergen';
import { ExportCountry } from '@/types/label';

/**
 * 5대 권역 법정 알레르겐 식별 맵
 */
interface AllergenRuleConfig {
  key: string;
  nameKo: string;
  mandatoryCountries: ExportCountry[];
  keywordsKo: string[];
  keywordsEn: string[];
  specificSpeciesRequired?: boolean; // 견과류, 어류, 갑각류 등 특정 수종/어종 필수 여부
  validSpeciesListEn?: string[];
}

export const ALLERGEN_RULE_CONFIGS: AllergenRuleConfig[] = [
  {
    key: 'WHEAT',
    nameKo: '밀/글루텐',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['밀', '소맥', '밀가루', '글루텐', '밀전분'],
    keywordsEn: ['wheat', 'wheat flour', 'gluten', 'spelt', 'kamut'],
  },
  {
    key: 'SOY',
    nameKo: '대두/콩',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['대두', '콩', '간장', '된장', '두부', '두유', '탈지대두', '대두유'],
    keywordsEn: ['soy', 'soybean', 'soya', 'tofu', 'soy sauce', 'edamame'],
  },
  {
    key: 'SESAME',
    nameKo: '참깨',
    mandatoryCountries: ['US', 'JP', 'EU', 'UAE'], // US: 2023 FASTER Act
    keywordsKo: ['참깨', '깨', '참기름', '볶음참깨', '들깨', '흑임자'],
    keywordsEn: ['sesame', 'sesame oil', 'sesame seeds', 'tahini'],
  },
  {
    key: 'CRUSTACEAN',
    nameKo: '갑각류',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['새우', '게', '랍스터', '가재', '크랩', '대게', '새우젓'],
    keywordsEn: ['crustacean', 'crustaceans', 'shrimp', 'crab', 'lobster', 'prawn', 'crawfish', 'shellfish'],
    specificSpeciesRequired: true,
    validSpeciesListEn: ['shrimp', 'crab', 'lobster', 'prawn', 'crawfish', 'blue crab', 'king crab', 'snow crab'],
  },
  {
    key: 'FISH',
    nameKo: '어류',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['생선', '어육', '명태', '대구', '연어', '참치', '멸치', '가쓰오', '어간장', '액젓'],
    keywordsEn: ['fish', 'pollock', 'cod', 'salmon', 'tuna', 'anchovy', 'bonito', 'mackerel', 'halibut'],
    specificSpeciesRequired: true,
    validSpeciesListEn: ['pollock', 'cod', 'salmon', 'tuna', 'anchovy', 'bonito', 'mackerel', 'halibut', 'sardine', 'tilapia', 'snapper'],
  },
  {
    key: 'EGG',
    nameKo: '계란/알류',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['계란', '달걀', '난백', '난황', '알', '전란'],
    keywordsEn: ['egg', 'eggs', 'egg white', 'egg yolk', 'albumin', 'lysozyme'],
  },
  {
    key: 'MILK',
    nameKo: '우유/유제품',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['우유', '원유', '분유', '치즈', '버터', '유청', '카제인', '유당'],
    keywordsEn: ['milk', 'dairy', 'whey', 'casein', 'cheese', 'butter', 'lactose', 'cream'],
  },
  {
    key: 'PEANUT',
    nameKo: '땅콩',
    mandatoryCountries: ['US', 'CN', 'JP', 'EU', 'UAE'],
    keywordsKo: ['땅콩', '낙화생', '피넛'],
    keywordsEn: ['peanut', 'peanuts', 'peanut butter', 'groundnut'],
  },
  {
    key: 'WALNUT',
    nameKo: '호두',
    mandatoryCountries: ['US', 'JP', 'EU', 'CN', 'UAE'],
    keywordsKo: ['호두', '호도'],
    keywordsEn: ['walnut', 'walnuts'],
    specificSpeciesRequired: true,
    validSpeciesListEn: ['walnut', 'walnuts'],
  },
  {
    key: 'CASHEW',
    nameKo: '캐슈넛',
    mandatoryCountries: ['US', 'JP', 'EU', 'CN', 'UAE'], // JP: 2025년 특정원재료 의무 승격
    keywordsKo: ['캐슈넛', '캐슈'],
    keywordsEn: ['cashew', 'cashews', 'cashew nut'],
    specificSpeciesRequired: true,
    validSpeciesListEn: ['cashew', 'cashews', 'cashew nut'],
  },
  {
    key: 'TREE_NUT',
    nameKo: '견과류',
    mandatoryCountries: ['US', 'EU', 'CN', 'UAE'],
    keywordsKo: ['견과류', '아몬드', '피스타치오', '헤이즐넛', '피칸', '마카다미아', '잣'],
    keywordsEn: ['tree nut', 'tree nuts', 'almond', 'pistachio', 'hazelnut', 'pecan', 'macadamia', 'pine nut', 'brazil nut'],
    specificSpeciesRequired: true,
    validSpeciesListEn: ['almond', 'pistachio', 'hazelnut', 'pecan', 'macadamia', 'pine nut', 'brazil nut', 'walnut', 'cashew', 'chestnut'],
  },
  {
    key: 'BUCKWHEAT',
    nameKo: '메밀',
    mandatoryCountries: ['JP', 'CN'], // JP 8대 특정원재료
    keywordsKo: ['메밀', '모밀'],
    keywordsEn: ['buckwheat', 'soba'],
  },
  {
    key: 'MOLLUSC',
    nameKo: '연체동물',
    mandatoryCountries: ['EU', 'JP'],
    keywordsKo: ['오징어', '문어', '낙지', '조개', '홍합', '굴', '가리비', '바지락', '전복'],
    keywordsEn: ['mollusc', 'molluscs', 'squid', 'octopus', 'clam', 'mussel', 'oyster', 'scallop', 'abalone'],
  },
];

/**
 * 1. Extract allergen sources structured model from ingredient declarations
 */
export function extractAllergenSources(input: ValidationInput): AllergenSourceItem[] {
  const sources: AllergenSourceItem[] = [];
  const country = input.country;

  for (const ing of input.ingredients) {
    const ko = (ing.ingredientNameKo || '').toLowerCase();
    const target = (ing.ingredientNameTarget || ing.ingredientNameEn || '').toLowerCase();

    for (const config of ALLERGEN_RULE_CONFIGS) {
      const matchKo = config.keywordsKo.some((k) => ko.includes(k));
      const matchTarget = config.keywordsEn.some((k) => target.includes(k));

      if (matchKo || matchTarget) {
        const isMandatory = config.mandatoryCountries.includes(country);

        // Check specific species requirement
        let speciesNameEn: string | undefined = undefined;
        if (config.specificSpeciesRequired && config.validSpeciesListEn) {
          speciesNameEn = config.validSpeciesListEn.find((s) => target.includes(s) || ko.includes(s));
        }

        let emphasis: 'CONTAINS_BOX' | 'BOLD_IN_LIST' | 'SPECIFIC_RAW_MATERIAL' | 'STANDARD' = 'STANDARD';
        if (country === 'US') emphasis = 'CONTAINS_BOX';
        else if (country === 'EU') emphasis = 'BOLD_IN_LIST';
        else if (country === 'JP') emphasis = 'SPECIFIC_RAW_MATERIAL';

        sources.push({
          jurisdiction: country,
          allergenKey: config.key,
          sourceIngredientNameKo: ing.ingredientNameKo,
          sourceIngredientNameTarget: ing.ingredientNameTarget || ing.ingredientNameEn,
          specificSpeciesRequired: config.specificSpeciesRequired,
          speciesNameEn,
          declarationRequired: isMandatory,
          emphasisType: emphasis,
        });
      }
    }
  }

  return sources;
}

/**
 * 2. Audit Allergen Declarations:
 *    - Specific species enforcement (Tree Nut, Fish, Crustacean)
 *    - Deceptive Advisory replacement check (May Contain vs Contains)
 *    - Japan 2025 Cashew nut upgrade & vague speculation ban
 */
export function auditAllergenDeclarations(
  input: ValidationInput,
  sources: AllergenSourceItem[]
): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
  audit: AllergenDeclarationAudit;
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  const rawText = (input.rawText || '').toLowerCase();

  // Extract CONTAINS: block
  let containsText = '';
  const containsMatch = rawText.match(/contains:\s*([^.\n]+)/i);
  if (containsMatch && containsMatch[1]) {
    containsText = containsMatch[1].toLowerCase();
  }

  // Extract MAY CONTAIN: / advisory block
  let advisoryText = '';
  const advisoryMatch = rawText.match(/(?:may contain|manufactured in a facility that also processes|facility processes|alsp processes):\s*([^.\n]+)/i);
  if (advisoryMatch && advisoryMatch[1]) {
    advisoryText = advisoryMatch[1].toLowerCase();
  }

  // 1. Mandatory Allergen Species Specificity (US FDA 21 CFR 101.4 & EU FIC)
  for (const src of sources) {
    if (src.declarationRequired && src.specificSpeciesRequired) {
      if (!src.speciesNameEn) {
        if (input.country === 'US') {
          critical.push({
            code: 'US-CRIT-ALLERGEN-SPECIES-SPECIFIC',
            field: 'ingredients',
            severity: 'critical',
            title: `알레르겐 구체 수종/어종 명시 누락 (${src.allergenKey})`,
            message: `미국 FDA 21 CFR 101.4(h)에 따라 견과류(Tree Nuts), 어류(Fish), 갑각류(Crustacean)는 총칭 대신 구체적 품종명(예: Walnut, Almond, Pollock, Shrimp)을 필수 표기해야 합니다. 현재 "${src.sourceIngredientNameKo}"에 구체 수종이 명시되지 않았습니다.`,
            solution: `원재료명 및 CONTAINS 박스에 "Tree nuts", "Fish", "Shellfish" 단독 표기를 지양하고 구체 품종명(예: "Walnut", "Pollock", "Shrimp")을 명시하십시오.`,
            lawReference: '21 CFR 101.4(h) / FALCPA Section 203',
            ruleId: 'US-ALLERGEN-SPECIES-21CFR',
            whyProblem: 'FDA 통관 검역 시 수종이 불분명한 견과류/어류 라벨은 소비자 오도 및 심각한 알레르기 쇼크 위험으로 즉시 리콜 및 억류 대상입니다.',
            howToFix: `원재료명을 구체 어종(예: "연어 / Atlantic Salmon" 또는 "새우 / White Shrimp")으로 특정하십시오.`,
            authority: 'US FDA'
          });
        } else if (input.country === 'EU') {
          warnings.push({
            code: 'EU-WARN-ALLERGEN-SPECIES-SPECIFIC',
            field: 'ingredients',
            severity: 'warning',
            title: `EU 알레르겐 구체 품종 명시 권고 (${src.allergenKey})`,
            message: `EU FIC 1169/2011 Annex II에 따라 견과류 및 수산물 성분의 구체적 종명을 표시해야 합니다.`,
            solution: `성분표에 구체적 학명 또는 일반 통칭 수종(예: Almonds, Hazelnuts)을 기재하십시오.`,
            lawReference: 'Regulation (EU) No 1169/2011 Annex II',
            ruleId: 'EU-ALLERGEN-SPECIES-FIC',
            whyProblem: '유럽 검역 당국은 포괄적 견과류 표기에 대해 보완 조치를 요구할 수 있습니다.',
            howToFix: '구체적인 수종명을 알레르겐 목록에 명시하십시오.',
            authority: 'EC FIC'
          });
        }
      }
    }
  }

  // 2. Deceptive Advisory Replacement (원재료에 포함되어 있는데 May Contain으로 기만 표기)
  const illegalAdvisoryReplacements: string[] = [];
  const declaredContains: string[] = [];
  const declaredAdvisory: string[] = [];
  const unDeclaredFromIngredients: AllergenSourceItem[] = [];

  for (const src of sources) {
    if (!src.declarationRequired) continue;

    const config = ALLERGEN_RULE_CONFIGS.find((c) => c.key === src.allergenKey);
    if (!config) continue;

    const inContains =
      (input.allergensDeclared && input.allergensDeclared.some((a) => config.keywordsEn.some((k) => a.toLowerCase().includes(k)) || config.keywordsKo.some((k) => a.toLowerCase().includes(k)))) ||
      config.keywordsEn.some((k) => containsText.includes(k)) ||
      config.keywordsKo.some((k) => containsText.includes(k));

    const inAdvisory =
      config.keywordsEn.some((k) => advisoryText.includes(k)) ||
      config.keywordsKo.some((k) => advisoryText.includes(k));

    if (inContains) {
      declaredContains.push(src.allergenKey);
    } else if (inAdvisory) {
      // Deceptive advisory detected! (Present in recipe, but only declared in May Contain)
      illegalAdvisoryReplacements.push(src.allergenKey);
      declaredAdvisory.push(src.allergenKey);

      if (input.country === 'US') {
        critical.push({
          code: 'US-CRIT-ALLERGEN-DECEPTIVE-ADVISORY',
          field: 'rawText',
          severity: 'critical',
          title: `알레르겐 법정 선언의 불법 주의문구(May Contain) 위장 대체: ${config.nameKo}`,
          message: `원재료("${src.sourceIngredientNameKo}")에 배합된 알레르겐(${config.nameKo})을 CONTAINS 박스에 누락하고 "May contain(교차오염 주의문구)"으로만 기재하였습니다.`,
          solution: `FDA 가이드라인에 따라 제조시설 주의문구(Advisory)는 배합 성분 선언을 대체할 수 없습니다. 즉시 "CONTAINS: ${config.keywordsEn[0].toUpperCase()}" 박스에 정식 등록하십시오.`,
          lawReference: 'FDA Compliance Policy Guide Sec. 555.250 / FALCPA 2004',
          ruleId: 'US-ALLERGEN-NO-ADVISORY-SUB',
          whyProblem: '실제 원료로 투입된 알레르겐을 우발적 오염인 것처럼 위장하는 행위는 FDA 및 FTC에서 중대한 기만적 라벨링(Adulteration/Misbranding)으로 간주합니다.',
          howToFix: `라벨의 "CONTAINS:" 선언문에 "${config.keywordsEn[0].toUpperCase()}"를 반드시 포함시키십시오.`,
          authority: 'US FDA'
        });
      } else {
        critical.push({
          code: 'GLOBAL-CRIT-ALLERGEN-DECEPTIVE-ADVISORY',
          field: 'rawText',
          severity: 'critical',
          title: `배합 알레르겐의 교차오염 주의문구 불법 대체: ${config.nameKo}`,
          message: `실제 투입된 원재료 성분을 우발적 교차오염(May Contain)으로 축소 표기하는 것은 국제 식품 규정상 금지됩니다.`,
          solution: `성분표 및 정식 알레르겐 선언 위치에 해당 물질을 정식 선언하십시오.`,
          lawReference: 'CODEX General Standard for the Labelling of Prepackaged Foods',
          ruleId: 'GLOBAL-ALLERGEN-NO-ADVISORY-SUB',
          whyProblem: '소비자 생명 안전을 위협하는 허위 표시로 수입국 세관 즉시 통관 불합격 조치됩니다.',
          howToFix: '정규 알레르겐 표시란에 정식 기재하십시오.',
          authority: 'Regulatory Authority'
        });
      }
    } else {
      unDeclaredFromIngredients.push(src);
    }
  }

  // 3. Japan 2025 Cashew Nut Mandatory Upgrade & Speculation Ban
  if (input.country === 'JP') {
    // 3.1 Cashew Nut 2025 Mandatory Transition Check
    const hasCashewSource = sources.some((s) => s.allergenKey === 'CASHEW');
    if (hasCashewSource) {
      const isCashewDeclared = (input.allergensDeclared || []).some((a) => a.includes('カシューナッツ') || a.includes('cashew')) ||
        rawText.includes('カシューナッツ');
      if (!isCashewDeclared) {
        critical.push({
          code: 'JP-CRIT-ALLERGEN-CASHEW-2025-MANDATORY',
          field: 'allergensDeclared',
          severity: 'critical',
          title: '일본 소비자청 2025년 법정 특정원재료 의무화: 캐슈넛(カシューナッツ)',
          message: '일본 소비자청 식품표시법 개정에 따라 캐슈넛은 준특정원재료(권장)에서 8대 법정 특정원재료 의무군으로 승격되었습니다. 라벨에 표기가 누락되었습니다.',
          solution: '원재료 목록 괄호 표기 또는 알레르겐 일괄표시란에 "カシューナッツ"를 필수 표기하십시오.',
          lawReference: '消費者庁 食品表示基準別表第14 (2025년 시행령)',
          ruleId: 'JP-ALLERGEN-CASHEW-2025',
          whyProblem: '2025년 유예기간 종료 후 캐슈넛 미표기 제품은 일본 내 판매 정지 및 회수(리콜) 명령 대상입니다.',
          howToFix: '원재료 표시란에 "(一部にカシューナッツを含む)" 형태로 추가하십시오.',
          authority: '消費者庁 (CAA)'
        });
      }
    }

    // 3.2 Strict prohibition of speculative allergen warnings
    const speculativeKeywords = ['入っているかもしれない', '入っている可能性', '混入の可能性', '混ざっているかも'];
    for (const kw of speculativeKeywords) {
      if (rawText.includes(kw)) {
        critical.push({
          code: 'JP-CRIT-POSSIBLE-ALLERGEN-BAN',
          field: 'rawText',
          severity: 'critical',
          title: '일본 법률 전면 금지: 추정성 알레르겐 표기 ("들어 있을지도 모름")',
          message: `일본 소비자청 식품표시법상 "${kw}"와 같은 모호한 추정성 알레르겐 경고 문구는 법률상 절대 금지됩니다.`,
          solution: '공용 제조설비 사실 표기인 "本品製造工場では○○を含む製品を生産しています" 공인 문구로 전면 교체하십시오.',
          lawReference: '消費者庁 食品表示法 Q&A 第2条-5',
          ruleId: 'JP-ALLERGEN-NO-SPECULATION',
          whyProblem: '추정성 표기는 소비자의 명확한 선택권을 침해하여 부적격 라벨로 분류됩니다.',
          howToFix: '공장 공용라인 사실만을 적시하는 표준 문구로 수정하십시오.',
          authority: '消費者庁 (CAA)'
        });
      }
    }
  }

  const isFullyCompliant = critical.length === 0;

  return {
    critical,
    warnings,
    info,
    audit: {
      declaredContains,
      declaredAdvisory,
      unDeclaredFromIngredients,
      illegalAdvisoryReplacements,
      isFullyCompliant,
    },
  };
}

/**
 * Enterprise Allergen Engine Main Runner
 */
export function validateAllergenSourcesEngine(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
  sources: AllergenSourceItem[];
  audit: AllergenDeclarationAudit;
} {
  const sources = extractAllergenSources(input);
  const auditRes = auditAllergenDeclarations(input, sources);

  return {
    critical: auditRes.critical,
    warnings: auditRes.warnings,
    info: auditRes.info,
    sources,
    audit: auditRes.audit,
  };
}
