import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

const FRANKFURTER_V2_URL = "https://api.frankfurter.dev/v2/rate";

export { SUPPORTED_CURRENCIES, formatMoney } from "@/lib/currency-format";

async function fetchRateFromApi(from: string, to: string): Promise<number> {
  const res = await fetch(`${FRANKFURTER_V2_URL}/${from}/${to}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Rate fetch failed");
  const data = (await res.json()) as { rate: number };
  if (!data.rate) throw new Error("Rate not found");
  return data.rate;
}

export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;

  return unstable_cache(
    async () => {
      const cached = await db.exchangeRate.findFirst({
        where: { base: from, target: to },
        orderBy: { fetchedAt: "desc" },
      });

      if (
        cached &&
        Date.now() - cached.fetchedAt.getTime() < 24 * 60 * 60 * 1000
      ) {
        return Number(cached.rate);
      }

      try {
        const rate = await fetchRateFromApi(from, to);

        await db.exchangeRate.create({
          data: { base: from, target: to, rate },
        });

        return rate;
      } catch {
        if (cached) return Number(cached.rate);
        return 1;
      }
    },
    ["exchange-rate", from, to],
    { revalidate: 86_400 },
  )();
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string,
): Promise<{ converted: number; rate: number }> {
  const rate = await getExchangeRate(from, to);
  return { converted: amount * rate, rate };
}
