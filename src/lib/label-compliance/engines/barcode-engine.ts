import { ValidationInput, RedFlagItem } from '../types';
import { ExportCountry } from '@/types/label';

/**
 * GS1 Modulo-10 Check Digit Calculator for EAN-13
 * @param barcode12 First 12 digits of an EAN-13 barcode
 * @returns Correct check digit (0-9)
 */
export function calculateEan13CheckDigit(barcode12: string): number {
  if (!/^\d{12}$/.test(barcode12)) {
    throw new Error('Input must be exactly 12 digits');
  }

  let oddSum = 0; // Positions 1, 3, 5, 7, 9, 11 (0-indexed 0, 2, 4, 6, 8, 10)
  let evenSum = 0; // Positions 2, 4, 6, 8, 10, 12 (0-indexed 1, 3, 5, 7, 9, 11)

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode12[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const total = oddSum + evenSum * 3;
  const remainder = total % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * GS1 Modulo-10 Check Digit Calculator for UPC-A (12 digits)
 * @param barcode11 First 11 digits of a UPC-A barcode
 * @returns Correct check digit (0-9)
 */
export function calculateUpcACheckDigit(barcode11: string): number {
  if (!/^\d{11}$/.test(barcode11)) {
    throw new Error('Input must be exactly 11 digits');
  }

  let oddSum = 0; // Positions 1, 3, 5, 7, 9, 11 (0-indexed 0, 2, 4, 6, 8, 10)
  let evenSum = 0; // Positions 2, 4, 6, 8, 10 (0-indexed 1, 3, 5, 7, 9)

  for (let i = 0; i < 11; i++) {
    const digit = parseInt(barcode11[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const total = oddSum * 3 + evenSum;
  const remainder = total % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validate EAN-13 barcode format and checksum
 */
export function validateEan13(barcode: string): { isValid: boolean; expectedCheckDigit?: number; actualCheckDigit?: number } {
  const clean = barcode.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(clean)) {
    return { isValid: false };
  }

  const payload = clean.slice(0, 12);
  const actualCheckDigit = parseInt(clean[12], 10);
  const expectedCheckDigit = calculateEan13CheckDigit(payload);

  return {
    isValid: actualCheckDigit === expectedCheckDigit,
    expectedCheckDigit,
    actualCheckDigit,
  };
}

/**
 * Validate UPC-A barcode format and checksum
 */
export function validateUpcA(barcode: string): { isValid: boolean; expectedCheckDigit?: number; actualCheckDigit?: number } {
  const clean = barcode.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) {
    return { isValid: false };
  }

  const payload = clean.slice(0, 11);
  const actualCheckDigit = parseInt(clean[11], 10);
  const expectedCheckDigit = calculateUpcACheckDigit(payload);

  return {
    isValid: actualCheckDigit === expectedCheckDigit,
    expectedCheckDigit,
    actualCheckDigit,
  };
}

export interface RecyclingSymbolSpec {
  symbolId: string;
  country: ExportCountry;
  nameKo: string;
  nameTarget: string;
  description: string;
  mandatoryRule: string;
}

export const RECYCLING_SYMBOLS: RecyclingSymbolSpec[] = [
  {
    symbolId: 'JP_PLA_MARK',
    country: 'JP',
    nameKo: '일본 플라스틱 식별 마크 (プラ)',
    nameTarget: 'プラマーク (プラスチック製容器包装識別表示)',
    description: '일본 용기포장리사이클법에 따라 플라스틱 필름/트레이 포장재에 법정 심볼 표시 의무',
    mandatoryRule: '資源有効利用促進法 (資源化義務表示)',
  },
  {
    symbolId: 'JP_PAPER_MARK',
    country: 'JP',
    nameKo: '일본 종이 식별 마크 (紙)',
    nameTarget: '紙マーク (紙製容器包装識別表示)',
    description: '외부 카톤 및 종이 상자에 법정 紙 심볼 표시 의무',
    mandatoryRule: '資源有効利用促進法',
  },
  {
    symbolId: 'EU_TRIMAN_LOGO',
    country: 'EU',
    nameKo: '프랑스 Triman 로고 & Info-tri 가이드',
    nameTarget: 'Triman Logo & Sorting Instructions (Info-tri)',
    description: '프랑스 AGEC 순환경제법에 따른 재활용 분리수거 사람 형상 심볼 및 재질별 수거함 안내',
    mandatoryRule: 'French AGEC Law / Article L.541-9-3',
  },
  {
    symbolId: 'EU_GREEN_DOT',
    country: 'EU',
    nameKo: '독일 Der Grüne Punkt (Green Dot)',
    nameTarget: 'Der Grüne Punkt (Duales System)',
    description: '독일 포장재법(VerpackG / LUCID 등록)에 따른 회수 재활용 시스템 마크',
    mandatoryRule: 'Verpackungsgesetz (VerpackG)',
  },
  {
    symbolId: 'US_HOW2RECYCLE',
    country: 'US',
    nameKo: '미국 How2Recycle 표준 마크',
    nameTarget: 'How2Recycle Label / Resin Identification Code (RIC)',
    description: '북미 리테일러(Walmart, Target) 표준 플라스틱 수지 번호(RIC 1-7) 및 분리배출 안내',
    mandatoryRule: 'Sustainable Packaging Coalition Standard',
  },
];

/**
 * Enterprise Barcode & Recycling Marking Compliance Engine
 */
export function validateBarcodeAndMarking(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  const rawBarcode = input.barcodeNumber ? input.barcodeNumber.trim().replace(/[\s-]/g, '') : '';
  const barcodeType = input.barcodeType || (input.country === 'US' ? 'UPC-A' : 'EAN-13');

  // =========================================================================
  // 1. Barcode Number & Checksum Validation
  // =========================================================================
  if (rawBarcode) {
    if (!/^\d+$/.test(rawBarcode)) {
      critical.push({
        code: 'COMMON-CRIT-BARCODE-NON-NUMERIC',
        field: 'barcodeNumber',
        severity: 'critical',
        title: '바코드 번호 형식 오류 (숫자 이외 문자 포함)',
        message: `GS1 바코드는 순수 숫자로만 구성되어야 하나, 유효하지 않은 문자("${input.barcodeNumber}")가 입력되었습니다.`,
        solution: '공백이나 특수기호를 제외한 순수 숫자(12자리 또는 13자리)를 입력하십시오.',
        lawReference: 'GS1 General Specifications Section 5.1',
        ruleId: 'GS1-BARCODE-FORMAT',
        whyProblem: '바코드 스캐너 판독 불가로 리테일 물류센터 및 세관 입고가 거부됩니다.',
        howToFix: 'GS1 정규 발급 숫자 코드만을 등록하십시오.',
        authority: 'GS1'
      });
    } else if (barcodeType === 'UPC-A' || (input.country === 'US' && rawBarcode.length === 12)) {
      // UPC-A (12 digits)
      if (rawBarcode.length !== 12) {
        critical.push({
          code: 'US-CRIT-BARCODE-UPC-LENGTH',
          field: 'barcodeNumber',
          severity: 'critical',
          title: `UPC-A 바코드 자릿수 불일치 (현재: ${rawBarcode.length}자리 / 기준: 12자리)`,
          message: '북미 표준 UPC-A 바코드는 정확히 12자리 숫자여야 합니다.',
          solution: '12자리 UPC-A 바코드 번호를 입력하십시오.',
          lawReference: 'GS1 US Specifications for Retail POS',
          ruleId: 'US-BARCODE-12DIGIT',
          whyProblem: '미국 POS 유통망 시스템에서 12자리 규격 불일치 시 스캔 등록이 불가합니다.',
          howToFix: 'GS1 US 규격의 12자리 UPC-A 번호를 입력하십시오.',
          authority: 'GS1 US'
        });
      } else {
        const upcCheck = validateUpcA(rawBarcode);
        if (!upcCheck.isValid) {
          critical.push({
            code: 'US-CRIT-BARCODE-UPC-CHECKDIGIT-INVALID',
            field: 'barcodeNumber',
            severity: 'critical',
            title: `UPC-A 체크디지트 검증 실패 (입력값: ${upcCheck.actualCheckDigit} / 계산값: ${upcCheck.expectedCheckDigit})`,
            message: `GS1 Modulo-10 체크디지트 연산 결과, 마지막 12번째 검증 번호가 수학적으로 일치하지 않습니다.`,
            solution: `바코드 마지막 자리를 올바른 체크디지트 "${upcCheck.expectedCheckDigit}"로 수정하십시오 (올바른 바코드: ${rawBarcode.slice(0, 11)}${upcCheck.expectedCheckDigit}).`,
            lawReference: 'GS1 Standard Check Digit Calculation (Modulo 10)',
            ruleId: 'GS1-UPC-CHECKDIGIT-MISMATCH',
            whyProblem: '체크디지트 오류 바코드는 전 세계 모든 바코드 리더기에서 "스캔 에러(Read Error)"를 발생시킵니다.',
            howToFix: `마지막 검증 숫자를 ${upcCheck.expectedCheckDigit}(으)로 변경하십시오.`,
            authority: 'GS1 US'
          });
        }
      }
    } else {
      // EAN-13 (13 digits)
      if (rawBarcode.length !== 13) {
        if (input.country === 'US' && rawBarcode.length === 12) {
          // Allowed as UPC-A fallback
        } else {
          critical.push({
            code: 'COMMON-CRIT-BARCODE-EAN13-LENGTH',
            field: 'barcodeNumber',
            severity: 'critical',
            title: `EAN-13 바코드 자릿수 불일치 (현재: ${rawBarcode.length}자리 / 기준: 13자리)`,
            message: '국제 표준 EAN-13 바코드는 정확히 13자리 숫자여야 합니다.',
            solution: '국가코드(3자리)+제조업체코드+품목코드+체크디지트로 구성된 13자리를 입력하십시오.',
            lawReference: 'GS1 General Specifications Section 2.1',
            ruleId: 'GS1-EAN13-LENGTH',
            whyProblem: '자릿수 오류는 바코드 스캐너 인식 실패로 직결됩니다.',
            howToFix: '13자리 표준 EAN 번호를 입력하십시오.',
            authority: 'GS1'
          });
        }
      } else {
        const eanCheck = validateEan13(rawBarcode);
        if (!eanCheck.isValid) {
          critical.push({
            code: 'COMMON-CRIT-BARCODE-CHECKDIGIT-INVALID',
            field: 'barcodeNumber',
            severity: 'critical',
            title: `EAN-13 체크디지트 검증 실패 (입력값: ${eanCheck.actualCheckDigit} / 계산값: ${eanCheck.expectedCheckDigit})`,
            message: `GS1 Modulo-10 가중치(1:3) 연산 결과, 마지막 13번째 검증 번호가 수학적으로 불일치합니다.`,
            solution: `바코드 마지막 자리를 올바른 체크디지트 "${eanCheck.expectedCheckDigit}"로 수정하십시오 (올바른 바코드: ${rawBarcode.slice(0, 12)}${eanCheck.expectedCheckDigit}).`,
            lawReference: 'GS1 Standard Modulo-10 Checksum Algorithm',
            ruleId: 'GS1-EAN13-CHECKDIGIT-MISMATCH',
            whyProblem: '체크섬 불일치는 전 세계 유통 매장 POS 시스템에서 상품 인식 불가(Unscannable) 오류를 유발합니다.',
            howToFix: `바코드 마지막 숫자를 ${eanCheck.expectedCheckDigit}(으)로 수정하십시오.`,
            authority: 'GS1'
          });
        }

        // Prefix verification
        const prefix = rawBarcode.slice(0, 3);
        if (prefix === '880') {
          info.push({
            code: 'GS1-INFO-KOREA-PREFIX',
            field: 'barcodeNumber',
            severity: 'info',
            title: 'GS1 한국 상공회의소 국가 프리픽스 확인 (880)',
            message: '대한민국(GS1 Korea) 정식 등록 국가 식별 프리픽스(880)가 정상 확인되었습니다.',
            solution: '정상 바코드입니다.',
            lawReference: 'GS1 Prefix Allocation List',
            ruleId: 'GS1-PREFIX-880-KR',
            authority: 'GS1 Korea'
          });
        }
      }
    }
  }

  // =========================================================================
  // 2. Recycling & Separation Symbol Verification by Country
  // =========================================================================
  const rawText = (input.rawText || '').toLowerCase();

  // 2.1 Japan Plastic (プラ) & Paper (紙) Symbol Enforcement
  if (input.country === 'JP') {
    const hasJpRecycle = rawText.includes('プラ') || rawText.includes('pla') || rawText.includes('紙') || rawText.includes('リサイクル');
    if (!hasJpRecycle) {
      warnings.push({
        code: 'JP-WARN-RECYCLE-MARK-MISSING',
        field: 'rawText',
        severity: 'warning',
        title: '일본 법정 분리배출 식별 마크 (プラ/紙) 인쇄 권고',
        message: '일본 자원의 유효이용 촉진법에 따라 포장재 표면에 플라스틱(プラ) 또는 종이(紙) 법정 식별 표시가 의무화되어 있습니다.',
        solution: '포장재 재질에 맞는 プラ(플라스틱) 또는 紙(종이) 심볼을 라벨 인쇄 도안에 배치하십시오.',
        lawReference: '資源の有効な利用の促進に関する法律 (資源有効利用促進法)',
        ruleId: 'JP-RECYCLE-PLA-MARK',
        whyProblem: '일본 대형 유통사(이온, 세븐앤아이) 입점 검수 시 재활용 마크 누락은 100% 반품 및 수정 스티커 부착 요구 대상입니다.',
        howToFix: '라벨 일러스트 도안에 6mm 이상의 법정 プラ 마크를 인쇄하십시오.',
        authority: '経済産業省 / 環境省 (METI / MOE)'
      });
    }
  }

  // 2.2 EU / France Triman & Info-tri Sorting Logo
  if (input.country === 'EU') {
    const hasTriman = rawText.includes('triman') || rawText.includes('info-tri') || rawText.includes('tri');
    if (!hasTriman) {
      info.push({
        code: 'EU-INFO-TRIMAN-SORTING-GUIDE',
        field: 'rawText',
        severity: 'info',
        title: 'EU/프랑스 Triman 로고 및 Info-tri 분리배출 가이드 점검 권고',
        message: '프랑스 수출 시 AGEC 법률에 따라 포장재에 Triman 심볼과 재질별 분리배출 지침(Info-tri) 표시가 필수적입니다.',
        solution: '프랑스 CITEO 규격의 Triman 로고 및 분리배출 픽토그램을 인쇄 도안에 반영하십시오.',
        lawReference: 'French AGEC Law / Article L.541-9-3',
        ruleId: 'EU-TRIMAN-FRANCE-AGEC',
        whyProblem: '프랑스 세관 검역 및 현지 유통 시 Triman 미표기 제품은 건당 최대 15,000유로의 과태료가 부과될 수 있습니다.',
        howToFix: 'CITEO 가이드라인에 부합하는 Triman 로고 벡터 심볼을 인쇄판에 포함하십시오.',
        authority: 'ADEME / CITEO'
      });
    }
  }

  return { critical, warnings, info };
}
