import "dotenv/config";

import { TransactionType } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";

const FRANKFURTER_V2_URL = "https://api.frankfurter.dev/v2/rate";
const BATCH_SIZE = 500;

type UpdateData = {
  toAmount?: number;
  amountInBaseCurrency?: number;
  exchangeRate?: number;
};

async function main() {
  const [settings, accounts, transactions, storedRates] = await db.$transaction([
    db.userSettings.findMany({
      select: { userId: true, defaultCurrency: true },
    }),
    db.walletAccount.findMany({
      select: { id: true, userId: true, currency: true },
    }),
    db.transaction.findMany({
      where: {
        OR: [
          {
            type: TransactionType.TRANSFER,
            toAmount: null,
            fromAccountId: { not: null },
            toAccountId: { not: null },
          },
          { exchangeRate: null },
          { exchangeRate: 1 },
        ],
      },
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        toAmount: true,
        exchangeRate: true,
        fromAccountId: true,
        toAccountId: true,
      },
    }),
    db.exchangeRate.findMany({
      orderBy: { fetchedAt: "desc" },
      select: { base: true, target: true, rate: true, fetchedAt: true },
    }),
  ]);

  const baseCurrencyByUser = new Map(
    settings.map((row) => [row.userId, row.defaultCurrency]),
  );
  const currencyByAccount = new Map(
    accounts.map((account) => [account.id, account.currency]),
  );
  const rateByPair = new Map<string, number>();
  for (const rate of storedRates) {
    const key = `${rate.base}:${rate.target}`;
    if (!rateByPair.has(key)) rateByPair.set(key, Number(rate.rate));
  }

  const newRates = new Map<string, { base: string; target: string; rate: number }>();
  async function resolveRate(base: string, target: string) {
    if (base === target) return 1;
    const key = `${base}:${target}`;
    const known = rateByPair.get(key);
    if (known != null) return known;

    const response = await fetch(`${FRANKFURTER_V2_URL}/${base}/${target}`);
    if (!response.ok) throw new Error(`Unable to fetch ${base}/${target}`);
    const body = (await response.json()) as { rate?: number };
    if (!body.rate) throw new Error(`Missing rate for ${base}/${target}`);
    rateByPair.set(key, body.rate);
    newRates.set(key, { base, target, rate: body.rate });
    return body.rate;
  }

  const updates = new Map<string, UpdateData>();
  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const fromCurrency = transaction.fromAccountId
      ? currencyByAccount.get(transaction.fromAccountId)
      : undefined;
    const toCurrency = transaction.toAccountId
      ? currencyByAccount.get(transaction.toAccountId)
      : undefined;
    const data = updates.get(transaction.id) ?? {};

    if (
      transaction.type === TransactionType.TRANSFER &&
      transaction.toAmount == null &&
      fromCurrency &&
      toCurrency
    ) {
      data.toAmount =
        amount * (await resolveRate(fromCurrency, toCurrency));
    }

    if (
      transaction.exchangeRate == null ||
      Number(transaction.exchangeRate) === 1
    ) {
      const baseCurrency = baseCurrencyByUser.get(transaction.userId) ?? "USD";
      const sourceCurrency =
        transaction.type === TransactionType.INCOME
          ? toCurrency
          : fromCurrency;
      if (sourceCurrency && sourceCurrency !== baseCurrency) {
        const rate = await resolveRate(sourceCurrency, baseCurrency);
        data.amountInBaseCurrency = amount * rate;
        data.exchangeRate = rate;
      }
    }

    if (Object.keys(data).length > 0) {
      updates.set(transaction.id, data);
    }
  }

  if (newRates.size > 0) {
    await db.exchangeRate.createMany({ data: [...newRates.values()] });
  }

  const entries = [...updates.entries()];
  for (let index = 0; index < entries.length; index += BATCH_SIZE) {
    await db.$transaction(
      entries.slice(index, index + BATCH_SIZE).map(([id, data]) =>
        db.transaction.update({ where: { id }, data }),
      ),
    );
  }

  console.log(
    `Backfilled ${entries.length} transactions and ${newRates.size} exchange rates.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
