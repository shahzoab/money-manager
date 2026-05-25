import { DecimalSeparator, RoundingMode } from "@/generated/prisma/enums";

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "PKR",
  "AED", "SAR", "TRY", "RUB", "BRL", "MXN", "KRW", "SGD", "HKD", "NZD",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ZAR", "NGN", "EGP", "BTC",
  "ETH",
];

export function formatMoney(
  amount: number,
  currency: string,
  options?: {
    decimalSeparator?: DecimalSeparator;
    roundingMode?: RoundingMode;
  },
): string {
  let value = amount;
  const mode = options?.roundingMode ?? RoundingMode.NONE;

  if (mode === RoundingMode.NEAREST) value = Math.round(value);
  else if (mode === RoundingMode.UP) value = Math.ceil(value);
  else if (mode === RoundingMode.DOWN) value = Math.floor(value);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.length === 3 ? currency : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (options?.decimalSeparator === DecimalSeparator.COMMA) {
    return formatted.replace(/(\d)\.(\d)/g, "$1,$2");
  }
  return formatted;
}
