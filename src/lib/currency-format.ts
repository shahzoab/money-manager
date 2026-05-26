import { DecimalSeparator, RoundingMode } from "@/generated/prisma/enums";

export const wholeNumberFormat = {
  fractionDigits: 0,
  roundingMode: RoundingMode.NEAREST,
} as const;

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "PKR",
  "AED", "SAR", "TRY", "RUB", "BRL", "MXN", "KRW", "SGD", "HKD", "NZD",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ZAR", "NGN", "EGP", "BTC",
  "ETH",
];

export function formatAmount(
  amount: number,
  options?: {
    decimalSeparator?: DecimalSeparator;
    roundingMode?: RoundingMode;
    fractionDigits?: number;
  },
): string {
  let value = amount;
  const mode = options?.roundingMode ?? RoundingMode.NONE;
  const fractionDigits = options?.fractionDigits ?? 2;

  if (mode === RoundingMode.NEAREST) value = Math.round(value);
  else if (mode === RoundingMode.UP) value = Math.ceil(value);
  else if (mode === RoundingMode.DOWN) value = Math.floor(value);

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  if (options?.decimalSeparator === DecimalSeparator.COMMA) {
    return formatted.replace(/(\d)\.(\d)/g, "$1,$2");
  }
  return formatted;
}

export function formatMoney(
  amount: number,
  currency: string,
  options?: {
    decimalSeparator?: DecimalSeparator;
    roundingMode?: RoundingMode;
    fractionDigits?: number;
  },
): string {
  let value = amount;
  const mode = options?.roundingMode ?? RoundingMode.NONE;
  const fractionDigits = options?.fractionDigits ?? 2;

  if (mode === RoundingMode.NEAREST) value = Math.round(value);
  else if (mode === RoundingMode.UP) value = Math.ceil(value);
  else if (mode === RoundingMode.DOWN) value = Math.floor(value);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.length === 3 ? currency : "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  if (options?.decimalSeparator === DecimalSeparator.COMMA) {
    return formatted.replace(/(\d)\.(\d)/g, "$1,$2");
  }
  return formatted;
}
