/**
 * Song Youngmin Food Daily USD/KRW Exchange Rate Helper
 * Default Rate: 1,450 KRW per 1 USD
 */

export const DEFAULT_EXCHANGE_RATE = 1450; // ₩1,450원 / $1 USD

export function getStoredExchangeRate(): number {
  if (typeof window === 'undefined') return DEFAULT_EXCHANGE_RATE;
  try {
    const saved = localStorage.getItem('songfood_exchange_rate');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 500 && parsed < 3000) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read exchange rate from localStorage:', e);
  }
  return DEFAULT_EXCHANGE_RATE;
}

export function saveStoredExchangeRate(rate: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('songfood_exchange_rate', rate.toString());
    window.dispatchEvent(new Event('songfood_exchange_rate_updated'));
  } catch (e) {
    console.error('Failed to save exchange rate:', e);
  }
}

export function convertKrwToUsd(krwAmount: number, rate: number = DEFAULT_EXCHANGE_RATE): number {
  if (!krwAmount || krwAmount <= 0) return 0;
  const currentRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;
  return Math.round((krwAmount / currentRate) * 100) / 100;
}
