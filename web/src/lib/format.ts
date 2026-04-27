// Money formatting from minor units (most ISO-4217 currencies → 2 decimals).
const NO_DECIMAL = new Set(['JPY']);

export function fromMinor(amount: number, currency: string): number {
  if (NO_DECIMAL.has(currency)) return amount;
  return amount / 100;
}

export function toMinor(amount: number, currency: string): number {
  if (NO_DECIMAL.has(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

const SYMBOLS: Record<string, string> = {
  RUB: '₽', INR: '₹', CNY: '¥', EUR: '€', TRY: '₺', BYN: 'Br',
  UZS: 'сум', KZT: '₸', KGS: 'сом', AMD: '֏', AZN: '₼', GEL: '₾', USD: '$',
};

export function symbolFor(currency: string): string {
  return SYMBOLS[currency] || currency;
}

export function formatMoney(amountMinor: number, currency: string, locale = 'ru'): string {
  const value = fromMinor(amountMinor, currency);
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

export function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  return rate.toFixed(6);
}
