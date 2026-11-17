const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function formatPriceFa(amount: number): string {
  const formatted = Math.round(amount).toLocaleString('en-US');
  return toPersianDigits(formatted);
}

export function formatDigits(input: string | number, lang: 'fa' | 'en' = 'fa'): string {
  const str = String(input);
  return lang === 'fa' ? toPersianDigits(str) : str;
}

export function formatPrice(amount: number, lang: 'fa' | 'en' = 'fa'): string {
  const formatted = Math.round(amount).toLocaleString('en-US');
  return lang === 'fa' ? toPersianDigits(formatted) : formatted;
}

