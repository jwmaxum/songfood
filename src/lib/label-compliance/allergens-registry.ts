import { ExportCountry } from '@/types/label';

export interface AllergenDefinition {
  id: string;
  categoryKo: string;
  names: Record<ExportCountry, string[]>;
  isMandatoryIn: ExportCountry[];
  notes?: string;
}

/**
 * 5대 권역 통합 법정 알레르겐 표준 레지스트리
 */
export const GLOBAL_ALLERGENS_REGISTRY: AllergenDefinition[] = [
  {
    id: 'wheat',
    categoryKo: '밀/글루텐',
    names: {
      US: ['Wheat', 'Wheat flour', 'Gluten'],
      CN: ['小麦', '含有麸质的谷物', '小麦粉', '面粉'],
      JP: ['小麦', '小麦粉'],
      EU: ['Wheat', 'Cereals containing gluten', 'Weizen', 'Blé'],
      UAE: ['القمح', 'دقيق القمح', 'جلوتين']
    },
    isMandatoryIn: ['US', 'CN', 'JP', 'EU', 'UAE']
  },
  {
    id: 'soybean',
    categoryKo: '대두/콩',
    names: {
      US: ['Soybeans', 'Soy', 'Soybean oil', 'Tofu'],
      CN: ['大豆', '大豆及其制品', '黄豆', '豆腐'],
      JP: ['大豆', '豆腐', '大豆油'],
      EU: ['Soybeans', 'Soya', 'Sojabohnen', 'Soja'],
      UAE: ['فول الصويا', 'صويا']
    },
    isMandatoryIn: ['US', 'CN', 'JP', 'EU', 'UAE']
  },
  {
    id: 'sesame',
    categoryKo: '참깨',
    names: {
      US: ['Sesame', 'Sesame seeds', 'Sesame oil'],
      CN: ['芝麻', '芝麻及其制品', '芝麻油'],
      JP: ['ごま', '胡麻', 'ごま油'],
      EU: ['Sesame seeds', 'Sesam', 'Graines de sésame'],
      UAE: ['السمسم', 'بذور السمسم', 'زيت السمسم']
    },
    isMandatoryIn: ['US', 'JP', 'EU', 'UAE'], // US: 2023 FASTER Act 발효
    notes: 'US: 2023년 FASTER Act로 9대 법정 의무 알레르겐으로 발효됨'
  },
  {
    id: 'crustacean',
    categoryKo: '갑각류(새우/게)',
    names: {
      US: ['Crustacean shellfish', 'Shrimp', 'Crab', 'Lobster', 'Prawn'],
      CN: ['甲壳类', '甲壳纲动物及其制品', '虾', '虾仁', '蟹'],
      JP: ['えび', 'かに', 'エビ', 'カニ', '海老'],
      EU: ['Crustaceans', 'Shrimp', 'Krebstiere', 'Crustacés'],
      UAE: ['قشريات', 'روبيان', 'جمبري', 'سلطعون']
    },
    isMandatoryIn: ['US', 'CN', 'JP', 'EU', 'UAE']
  },
  {
    id: 'egg',
    categoryKo: '계란/알류',
    names: {
      US: ['Eggs', 'Egg white', 'Egg yolk'],
      CN: ['蛋类', '蛋类及其制品', '鸡蛋'],
      JP: ['卵', '鶏卵', 'たまご'],
      EU: ['Eggs', 'Eier', 'Œufs'],
      UAE: ['البيض', 'بيض']
    },
    isMandatoryIn: ['US', 'CN', 'JP', 'EU', 'UAE']
  },
  {
    id: 'milk',
    categoryKo: '우유/유제품',
    names: {
      US: ['Milk', 'Dairy', 'Butter', 'Cheese', 'Whey'],
      CN: ['乳及乳制品', '牛奶', '乳清粉'],
      JP: ['乳', '乳成分', '牛乳'],
      EU: ['Milk', 'Milch', 'Lait'],
      UAE: ['الحليب', 'حليب', 'مشتقات الحليب']
    },
    isMandatoryIn: ['US', 'CN', 'JP', 'EU', 'UAE']
  },
  {
    id: 'peanut',
    categoryKo: '땅콩',
    names: {
      US: ['Peanuts', 'Peanut butter'],
      CN: ['花生', '花生及其制品'],
      JP: ['落花生', 'ピーナッツ'],
      EU: ['Peanuts', 'Erdnüsse', 'Arachides'],
      UAE: ['الفول السوداني']
    },
    isMandatoryIn: ['US', 'CN', 'JP', 'EU', 'UAE']
  },
  {
    id: 'walnut',
    categoryKo: '호두',
    names: {
      US: ['Tree nuts (Walnut)', 'Walnut'],
      CN: ['坚果', '核桃'],
      JP: ['くるみ', '胡桃'],
      EU: ['Walnuts', 'Walnüsse'],
      UAE: ['جوز']
    },
    isMandatoryIn: ['US', 'JP', 'EU'], // JP: 2023년 의무화
    notes: 'JP: 2023년 3월 일본 소비자청 8대 특정원재료 의무 승격'
  },
  {
    id: 'cashew',
    categoryKo: '캐슈넛',
    names: {
      US: ['Tree nuts (Cashew)', 'Cashew'],
      CN: ['坚果', '腰果'],
      JP: ['カシューナッツ'],
      EU: ['Cashews', 'Cashewnüsse'],
      UAE: ['كاجو']
    },
    isMandatoryIn: ['US', 'JP', 'EU'], // JP: 2025년 의무 승격 반영
    notes: 'JP: 2025년 일본 소비자청 특정원재료 의무화 지정'
  }
];

/**
 * 특정 성분 텍스트에 알레르겐 키워드가 포함되어 있는지 검사
 */
export function matchAllergen(text: string, country: ExportCountry): AllergenDefinition | null {
  const normalized = text.toLowerCase();
  for (const allergen of GLOBAL_ALLERGENS_REGISTRY) {
    if (!allergen.isMandatoryIn.includes(country)) continue;
    const names = allergen.names[country] || [];
    for (const name of names) {
      if (normalized.includes(name.toLowerCase())) {
        return allergen;
      }
    }
  }
  return null;
}
