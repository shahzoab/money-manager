import { db } from "@/lib/db";

const FRANKFURTER_URL = "https://api.frankfurter.app/latest";

export { SUPPORTED_CURRENCIES, formatMoney } from "@/lib/currency-format";

export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;

  const cached = await db.exchangeRate.findFirst({
    where: { base: from, target: to },
    orderBy: { fetchedAt: "desc" },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < 24 * 60 * 60 * 1000) {
    return Number(cached.rate);
  }

  try {
    const res = await fetch(`${FRANKFURTER_URL}?from=${from}&to=${to}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Rate fetch failed");
    const data = (await res.json()) as { rates: Record<string, number> };
    const rate = data.rates[to];
    if (!rate) throw new Error("Rate not found");

    await db.exchangeRate.create({
      data: { base: from, target: to, rate },
    });

    return rate;
  } catch {
    if (cached) return Number(cached.rate);
    return 1;
  }
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string,
): Promise<{ converted: number; rate: number }> {
  const rate = await getExchangeRate(from, to);
  return { converted: amount * rate, rate };
}
