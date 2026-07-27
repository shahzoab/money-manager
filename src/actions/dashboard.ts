"use server";

import { requireSession } from "@/lib/auth-server";
import { getPeriodRange, type Period } from "@/lib/periods";
import {
  getTotalBalanceInCurrency,
} from "@/lib/balance";
import {
  loadPeriodTransactions,
  loadUserAccounts,
  loadUserCategories,
  loadUserSettings,
} from "@/lib/data-loaders";
import { TransactionType } from "@/generated/prisma/client";
import { summarizeTransactions } from "@/lib/dashboard-aggregation";

export async function getDashboardData(options?: {
  period?: Period;
  accountId?: string;
  customFrom?: Date;
  customTo?: Date;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const settings = await loadUserSettings(userId);
  const baseCurrency = settings?.defaultCurrency ?? "USD";
  const period = (options?.period ?? settings?.homePeriod ?? "month") as Period;
  const weekStartsOn = (settings?.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const { from, to } = getPeriodRange(
    period,
    options?.customFrom,
    options?.customTo,
    weekStartsOn,
  );

  const [totalBalance, transactions, accounts] = await Promise.all([
    getTotalBalanceInCurrency(userId, baseCurrency),
    loadPeriodTransactions(
      userId,
      from?.toISOString() ?? "",
      to?.toISOString() ?? "",
      options?.accountId ?? "",
    ),
    loadUserAccounts(userId),
  ]);
  const reportable = transactions.filter((transaction) => !transaction.isReconciliation);
  const summary = summarizeTransactions(reportable);

  return {
    totalBalance,
    income: summary.income,
    expenses: summary.expenses,
    transfers: summary.transfers,
    net: summary.net,
    baseCurrency,
    period,
    transactions: transactions.slice(0, 20),
    accounts: accounts.filter((account) => !account.isHidden),
    settings,
  };
}

export async function getChartData(options?: {
  period?: Period;
  accountId?: string;
  customFrom?: Date;
  customTo?: Date;
}) {
  const session = await requireSession();
  const userId = session.user.id;
  const settings = await loadUserSettings(userId);
  const period = (options?.period ?? "month") as Period;
  const weekStartsOn = (settings?.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const { from, to } = getPeriodRange(
    period,
    options?.customFrom,
    options?.customTo,
    weekStartsOn,
  );

  const [transactions, categories] = await Promise.all([
    loadPeriodTransactions(
      userId,
      from?.toISOString() ?? "",
      to?.toISOString() ?? "",
      options?.accountId ?? "",
    ),
    loadUserCategories(userId),
  ]);

  const byCategory: Record<string, number> = {};
  const monthlyTotals: Record<string, { income: number; expense: number }> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.isReconciliation) continue;
    const amount = Number(tx.amountInBaseCurrency);
    const monthKey = tx.date.slice(0, 7);

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { income: 0, expense: 0 };
    }

    if (tx.type === TransactionType.INCOME) {
      totalIncome += amount;
      monthlyTotals[monthKey].income += amount;
    }
    if (tx.type === TransactionType.EXPENSE) {
      totalExpense += amount;
      monthlyTotals[monthKey].expense += amount;
      const catId = tx.categoryId ?? "uncategorized";
      byCategory[catId] = (byCategory[catId] ?? 0) + amount;
    }
  }

  const trendData = Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      income: vals.income,
      expense: vals.expense,
      net: vals.income - vals.expense,
    }));

  const categoryChart = categories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
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
    trendData,
    baseCurrency: settings?.defaultCurrency ?? "USD",
  };
}
