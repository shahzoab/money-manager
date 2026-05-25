"use server";

import { requireSession } from "@/lib/auth-server";
import { activeWalletAccountWhere } from "@/lib/accounts";
import { db } from "@/lib/db";
import { getPeriodRange, type Period } from "@/lib/periods";
import { getTotalBalanceInCurrency } from "@/lib/balance";
import { buildTransactionSummary } from "@/lib/transaction-summary";
import { TransactionType } from "@/generated/prisma/client";

export async function getDashboardData(options?: {
  period?: Period;
  accountId?: string;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const settings = await db.userSettings.findUnique({ where: { userId } });
  const baseCurrency = settings?.defaultCurrency ?? "USD";
  const period = (options?.period ?? settings?.homePeriod ?? "month") as Period;
  const weekStartsOn = (settings?.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const { from, to } = getPeriodRange(period, undefined, undefined, weekStartsOn);

  const accountFilter = options?.accountId
    ? {
        OR: [
          { fromAccountId: options.accountId },
          { toAccountId: options.accountId },
        ],
      }
    : {};

  const where = {
    userId,
    date: { gte: from, lte: to },
    ...accountFilter,
  };

  const transactionInclude = {
    category: true,
    fromAccount: true,
    toAccount: true,
    tags: { include: { tag: true } },
  } as const;

  const [totalBalance, aggregates, chartTransactions, recentTransactions, accounts] =
    await Promise.all([
      getTotalBalanceInCurrency(userId, baseCurrency),
      db.transaction.groupBy({
        by: ["type"],
        where,
        _sum: { amountInBaseCurrency: true },
      }),
      db.transaction.findMany({
        where,
        include: { category: true },
      }),
      db.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: { date: "desc" },
        take: 20,
      }),
      db.walletAccount.findMany({
        where: { userId, isHidden: false, ...activeWalletAccountWhere },
        orderBy: { name: "asc" },
      }),
    ]);

  const { income, expenses, net: netFlow } = buildTransactionSummary(aggregates);
  const categoryTotals: Record<string, { name: string; color: string; amount: number }> = {};
  const dailyTotals: Record<string, { income: number; expense: number }> = {};

  for (const tx of chartTransactions) {
    const amount = Number(tx.amountInBaseCurrency);
    const dateKey = tx.date.toISOString().split("T")[0];

    if (!dailyTotals[dateKey]) {
      dailyTotals[dateKey] = { income: 0, expense: 0 };
    }

    if (tx.type === TransactionType.INCOME) {
      dailyTotals[dateKey].income += amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      dailyTotals[dateKey].expense += amount;
      if (tx.category) {
        const key = tx.category.id;
        if (!categoryTotals[key]) {
          categoryTotals[key] = {
            name: tx.category.name,
            color: tx.category.color,
            amount: 0,
          };
        }
        categoryTotals[key].amount += amount;
      }
    }
  }

  const trendData = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      income: vals.income,
      expense: vals.expense,
      net: vals.income - vals.expense,
    }));

  const categoryData = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    totalBalance,
    income,
    expenses,
    netFlow,
    baseCurrency,
    period,
    transactions: recentTransactions,
    accounts,
    trendData,
    categoryData,
    settings,
  };
}

export async function getChartData(options?: {
  period?: Period;
  accountId?: string;
}) {
  const session = await requireSession();
  const userId = session.user.id;
  const settings = await db.userSettings.findUnique({ where: { userId } });
  const period = (options?.period ?? "month") as Period;
  const weekStartsOn = (settings?.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const { from, to } = getPeriodRange(period, undefined, undefined, weekStartsOn);

  const accountFilter = options?.accountId
    ? {
        OR: [
          { fromAccountId: options.accountId },
          { toAccountId: options.accountId },
        ],
      }
    : {};

  const [transactions, categories] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
        ...accountFilter,
      },
      include: { category: true },
    }),
    db.category.findMany({
      where: { userId },
    }),
  ]);

  const byCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amountInBaseCurrency);
    if (tx.type === TransactionType.INCOME) totalIncome += amount;
    if (tx.type === TransactionType.EXPENSE) {
      totalExpense += amount;
      const catId = tx.categoryId ?? "uncategorized";
      byCategory[catId] = (byCategory[catId] ?? 0) + amount;
    }
  }

  const categoryChart = categories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      amount: byCategory[c.id] ?? 0,
      limit: c.monthlyLimit ? Number(c.monthlyLimit) : null,
    }))
    .filter((c) => c.amount > 0 || c.limit)
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    categoryChart,
    baseCurrency: settings?.defaultCurrency ?? "USD",
  };
}
