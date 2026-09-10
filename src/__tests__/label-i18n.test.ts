import {
  translateIngredient,
  batchTranslateIngredients,
  buildAllergenStatement,
  getStorageStatement,
  getCookingInstruction,
  getDatingPrefix,
  swapBoilerplateTexts,
} from '@/lib/label-i18n';

describe('Phase 5: Label i18n & Modular Boilerplate Engine', () => {
  describe('1. Ingredient Translation & Allergen Detection', () => {
    test('Translates standard K-Food ingredients into 5 target countries', () => {
      const wheatUs = translateIngredient('밀가루', 'US');
      expect(wheatUs.translatedText).toBe('Wheat Flour');
      expect(wheatUs.isAllergenInTarget).toBe(true);
      expect(wheatUs.confidence).toBe('exact');

      const wheatCn = translateIngredient('밀가루', 'CN');
      expect(wheatCn.translatedText).toBe('小麦粉');
      expect(wheatCn.isAllergenInTarget).toBe(true);

      const wheatJp = translateIngredient('밀가루', 'JP');
      expect(wheatJp.translatedText).toBe('小麦粉');
      expect(wheatJp.isAllergenInTarget).toBe(true);

      const wheatUae = translateIngredient('밀가루', 'UAE');
      expect(wheatUae.translatedText).toBe('دقيق القمح');
      expect(wheatUae.isAllergenInTarget).toBe(true);
    });

    test('Translates sesame and flags as allergen in US (2023 FASTER Act)', () => {
      const sesameUs = translateIngredient('참깨', 'US');
      expect(sesameUs.translatedText).toBe('Sesame Seeds');
      expect(sesameUs.isAllergenInTarget).toBe(true);
    });

    test('Detects banned ingredients in destination countries', () => {
      // E171 (Titanium dioxide) is banned in the EU
      const e171Eu = translateIngredient('이산화티타늄', 'EU');
      expect(e171Eu.isBannedInTarget).toBe(true);
      expect(e171Eu.eNumber).toBe('E171');

      // Pork is prohibited/haram in UAE
      const porkUae = translateIngredient('돼지고기', 'UAE');
      expect(porkUae.isBannedInTarget).toBe(true);

      // Pork is permitted in US, CN, JP
      const porkUs = translateIngredient('돼지고기', 'US');
      expect(porkUs.isBannedInTarget).toBe(false);
    });

    test('Translates food additives with INS / E-number correctly', () => {
      const msg = translateIngredient('L-글루탐산나트륨', 'US');
      expect(msg.translatedText).toContain('Monosodium Glutamate');
      expect(msg.eNumber).toBe('E621');

      const bakingSoda = translateIngredient('탄산수소나트륨', 'JP');
      expect(bakingSoda.translatedText).toContain('炭酸水素ナトリウム');
    });

    test('Gracefully handles unlisted ingredients with untranslated confidence', () => {
      const unknown = translateIngredient('우주특수비법소스1호', 'US');
      expect(unknown.confidence).toBe('untranslated');
      expect(unknown.translatedText).toBe('우주특수비법소스1호');
    });
  });

  describe('2. Batch Translation & Regulatory Formatting', () => {
    const mockIngredients = [
      { name: '밀가루', percentage: 40, isAllergen: true },
      { name: '돼지고기', percentage: 30 },
      { name: '대두', percentage: 15, isAllergen: true },
      { name: '참기름', percentage: 5 },
      { name: 'L-글루탐산나트륨', percentage: 1 },
    ];

    test('Formats EU ingredients with bold uppercase allergens', () => {
      const result = batchTranslateIngredients(mockIngredients, 'EU');
      expect(result.targetCountry).toBe('EU');
      expect(result.detectedAllergens).toContain('Wheat Flour');
      expect(result.detectedAllergens).toContain('Soybean');
      // EU allergens are capitalized/bold in the formatted string
      expect(result.formattedIngredientsText).toContain('WHEAT FLOUR (40%)');
      expect(result.formattedIngredientsText).toContain('SOYBEAN (15%)');
    });

    test('Formats CN ingredients with Chinese commas and Simplified Chinese', () => {
      const result = batchTranslateIngredients(mockIngredients, 'CN');
      expect(result.formattedIngredientsText).toContain('小麦粉(40%)');
      expect(result.formattedIngredientsText).toContain('，');
      expect(result.formattedIngredientsText).toContain('猪肉(30%)');
    });

    test('Formats JP ingredients with Japanese punctuation and terms', () => {
      const result = batchTranslateIngredients(mockIngredients, 'JP');
      expect(result.formattedIngredientsText).toContain('小麦粉(40%)');
      expect(result.formattedIngredientsText).toContain('、');
      expect(result.formattedIngredientsText).toContain('豚肉(30%)');
    });

    test('Detects banned ingredients in batch for UAE', () => {
      const result = batchTranslateIngredients(mockIngredients, 'UAE');
      expect(result.bannedIngredients.length).toBeGreaterThan(0);
      expect(result.bannedIngredients[0].originalKo).toBe('돼지고기');
    });
  });

  describe('3. Regulatory Boilerplates & Template Swapper', () => {
    test('Builds compliant allergen statements for US, CN, JP, UAE', () => {
      const allergens = ['Wheat', 'Soybeans', 'Sesame'];

      const usAllergen = buildAllergenStatement(allergens, ['Milk'], 'US');
      expect(usAllergen.statement).toBe('CONTAINS: Wheat, Soybeans, Sesame.');
      expect(usAllergen.crossContactStatement).toBe('May contain traces of Milk.');
      expect(usAllergen.fullBlock).toContain('CONTAINS:');

      const cnAllergen = buildAllergenStatement(['小麦', '大豆', '芝麻'], ['牛奶'], 'CN');
      expect(cnAllergen.statement).toContain('致敏原信息：含有小麦、大豆、芝麻。');
      expect(cnAllergen.crossContactStatement).toContain('此生产线亦加工含有牛奶的制品。');

      const jpAllergen = buildAllergenStatement(['小麦', '大豆', 'ごま'], [], 'JP');
      expect(jpAllergen.statement).toBe('原材料の一部に小麦・大豆・ごまを含みます。');

      const uaeAllergen = buildAllergenStatement(['القمح', 'فول الصويا'], [], 'UAE');
      expect(uaeAllergen.statement).toContain('تحذير الحساسية: يحتوي على القمح و فول الصويا.');
    });

    test('Provides storage statements per country and condition', () => {
      const usFrozen = getStorageStatement('frozen', 'US');
      expect(usFrozen).toContain('Keep frozen');
      expect(usFrozen).toContain('-18°C');

      const jpFrozen = getStorageStatement('frozen', 'JP');
      expect(jpFrozen).toContain('-18℃以下で保存');

      const cnFrozen = getStorageStatement('frozen', 'CN');
      expect(cnFrozen).toContain('-18℃以下冷冻保存');

      const uaeFrozen = getStorageStatement('frozen', 'UAE');
      expect(uaeFrozen).toContain('يحفظ مجمداً');
    });

    test('Swaps boilerplate texts with one-click', () => {
      const swapped = swapBoilerplateTexts({
        storageType: 'frozen',
        allergens: ['Wheat', 'Soybean'],
        crossContactTraces: ['Egg'],
        cookingMethod: 'microwave',
        targetCountry: 'US',
      });

      expect(swapped.storageStatement).toContain('Keep frozen');
      expect(swapped.allergenStatement.statement).toContain('CONTAINS: Wheat, Soybean.');
      expect(swapped.cookingInstruction).toContain('Microwave');
      expect(swapped.datingPrefixBestBefore).toBe('BEST IF USED BY: ');
      expect(swapped.isRtl).toBe(false);

      const swappedUae = swapBoilerplateTexts({
        storageType: 'refrigerated',
        allergens: ['القمح'],
        cookingMethod: 'panFry',
        targetCountry: 'UAE',
      });
      expect(swappedUae.isRtl).toBe(true);
      expect(swappedUae.datingPrefixBestBefore).toBe('يفضل استخدامه قبل: ');
    });
  });
});
