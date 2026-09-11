import {
  calculateEan13CheckDigit,
  calculateUpcACheckDigit,
  validateEan13,
  validateUpcA,
  validateBarcodeAndMarking,
  RECYCLING_SYMBOLS,
} from '@/lib/label-compliance/engines/barcode-engine';
import { ValidationInput } from '@/lib/label-compliance/types';

describe('Phase 11: GS1 Barcode Engine & Recycling Symbols Library', () => {
  describe('1. GS1 Modulo-10 Check Digit Calculation', () => {
    it('accurately calculates EAN-13 check digit', () => {
      // 400638133393 -> check digit is 1 (STABILO: 4006381333931)
      const checkDigit1 = calculateEan13CheckDigit('400638133393');
      expect(checkDigit1).toBe(1);

      // 880104301483 -> check digit is 0 (8801043014830)
      const checkDigit2 = calculateEan13CheckDigit('880104301483');
      expect(checkDigit2).toBe(0);

      // 880100705294 -> check digit is 6 (8801007052946)
      const checkDigit3 = calculateEan13CheckDigit('880100705294');
      expect(checkDigit3).toBe(6);
    });

    it('accurately calculates UPC-A (12-digit) check digit', () => {
      // 01234567890 -> check digit is 5 (012345678905)
      const checkDigit = calculateUpcACheckDigit('01234567890');
      expect(checkDigit).toBe(5);

      // 85001234567 -> check digit is 1 (850012345671)
      const checkDigit2 = calculateUpcACheckDigit('85001234567');
      expect(checkDigit2).toBe(1);
    });
  });

  describe('2. Barcode Format and Checksum Validation', () => {
    it('validates authentic EAN-13 barcodes and flags Korean prefix 880', () => {
      const eanValid = validateEan13('8801007052946');
      expect(eanValid.isValid).toBe(true);

      const input: ValidationInput = {
        country: 'JP',
        productNameLocal: '韓国プルダック炒め麺',
        netWeightG: 140,
        barcodeType: 'EAN-13',
        barcodeNumber: '8801007052946',
        ingredients: [{ ingredientNameKo: '밀가루', ratio: 70 }],
        rawText: 'プラマーク (プラスチック製容器包装)',
      };

      const res = validateBarcodeAndMarking(input);
      expect(res.critical.length).toBe(0);
      expect(res.info.some((i) => i.code === 'GS1-INFO-KOREA-PREFIX')).toBe(true);
    });

    it('detects corrupted/mismatched EAN-13 check digit', () => {
      // Intentionally change last digit from 6 to 9
      const eanCorrupted = validateEan13('8801007052949');
      expect(eanCorrupted.isValid).toBe(false);
      expect(eanCorrupted.expectedCheckDigit).toBe(6);
      expect(eanCorrupted.actualCheckDigit).toBe(9);

      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'Ramen Pack',
        netWeightG: 120,
        barcodeType: 'EAN-13',
        barcodeNumber: '8801007052949', // invalid checksum!
        ingredients: [{ ingredientNameKo: '소맥분', ratio: 70 }],
      };

      const res = validateBarcodeAndMarking(input);
      expect(res.critical.some((c) => c.code === 'COMMON-CRIT-BARCODE-CHECKDIGIT-INVALID')).toBe(true);
      expect(res.critical[0].solution).toContain('8801007052946');
    });

    it('detects corrupted/mismatched UPC-A check digit for US market', () => {
      const upcCorrupted = validateUpcA('012345678909'); // expected is 5, provided 9
      expect(upcCorrupted.isValid).toBe(false);
      expect(upcCorrupted.expectedCheckDigit).toBe(5);

      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Crispy Dumplings',
        netWeightG: 450,
        barcodeType: 'UPC-A',
        barcodeNumber: '012345678909', // corrupted!
        ingredients: [{ ingredientNameKo: '밀가루', ratio: 60 }],
      };

      const res = validateBarcodeAndMarking(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-BARCODE-UPC-CHECKDIGIT-INVALID')).toBe(true);
    });

    it('rejects invalid barcode lengths', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Snack',
        netWeightG: 50,
        barcodeType: 'UPC-A',
        barcodeNumber: '12345', // Only 5 digits
        ingredients: [{ ingredientNameKo: '옥수수', ratio: 90 }],
      };

      const res = validateBarcodeAndMarking(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-BARCODE-UPC-LENGTH')).toBe(true);
    });
  });

  describe('3. Recycling Symbol Library and Environmental Marking Checks', () => {
    it('contains valid recycling symbols for Japan, EU, and US', () => {
      expect(RECYCLING_SYMBOLS.length).toBeGreaterThanOrEqual(5);

      const jpPla = RECYCLING_SYMBOLS.find((s) => s.symbolId === 'JP_PLA_MARK');
      expect(jpPla).toBeDefined();
      expect(jpPla?.country).toBe('JP');

      const euTriman = RECYCLING_SYMBOLS.find((s) => s.symbolId === 'EU_TRIMAN_LOGO');
      expect(euTriman).toBeDefined();
      expect(euTriman?.country).toBe('EU');
    });

    it('warns on Japanese export when plastic (プラ) identification mark is missing', () => {
      const input: ValidationInput = {
        country: 'JP',
        productNameLocal: '韓国海苔',
        netWeightG: 30,
        barcodeNumber: '8801007052948',
        ingredients: [{ ingredientNameKo: '김', ratio: 95 }],
        rawText: '賞味期限: 2026.12.31', // No プラ mark!
      };

      const res = validateBarcodeAndMarking(input);
      expect(res.warnings.some((w) => w.code === 'JP-WARN-RECYCLE-MARK-MISSING')).toBe(true);
      expect(res.warnings[0].lawReference).toContain('資源有効利用促進法');
    });

    it('recommends French AGEC Triman logo on EU export packaging', () => {
      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'Bibigo Dumplings',
        netWeightG: 400,
        barcodeNumber: '8801007052948',
        ingredients: [{ ingredientNameKo: '밀가루', ratio: 50 }],
        rawText: 'Best Before: 2026-12-31',
      };

      const res = validateBarcodeAndMarking(input);
      expect(res.info.some((i) => i.code === 'EU-INFO-TRIMAN-SORTING-GUIDE')).toBe(true);
    });
  });
});
