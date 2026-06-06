import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
} from "date-fns";
import {
  RecurringFrequency,
  TransactionType,
} from "@/generated/prisma/client";
import { activeWalletAccountWhere } from "@/lib/accounts";
import { convertAmount } from "@/lib/currency";
import { db } from "@/lib/db";
import { sendPushNotificationToUser } from "@/lib/push";

function getNextDueDate(date: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case RecurringFrequency.DAILY:
      return addDays(date, 1);
    case RecurringFrequency.WEEKLY:
      return addWeeks(date, 1);
    case RecurringFrequency.MONTHLY:
      return addMonths(date, 1);
    case RecurringFrequency.YEARLY:
      return addYears(date, 1);
  }
}

async function getBaseCurrency(userId: string) {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { defaultCurrency: true },
  });

  return settings?.defaultCurrency ?? "USD";
}

async function getAccountCurrency(userId: string, accountId: string | null) {
  if (!accountId) return null;

  const account = await db.walletAccount.findFirst({
    where: { id: accountId, userId, ...activeWalletAccountWhere },
    select: { currency: true },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  return account.currency;
}

async function resolveBaseAmount(data: {
  userId: string;
  accountId: string | null;
  amount: number;
}) {
  const baseCurrency = await getBaseCurrency(data.userId);
  const accountCurrency = await getAccountCurrency(data.userId, data.accountId);

  if (!accountCurrency || accountCurrency === baseCurrency) {
    return { amountInBaseCurrency: data.amount, exchangeRate: null };
  }

  const { converted, rate } = await convertAmount(
    data.amount,
    accountCurrency,
    baseCurrency,
  );

  return { amountInBaseCurrency: converted, exchangeRate: rate };
}

export async function processDueRecurringPaymentsForUser(userId?: string) {
  const now = new Date();
  const duePayments = await db.recurringPayment.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isActive: true,
      nextDueDate: { lte: now },
    },
    include: {
      tags: { select: { tagId: true } },
    },
    orderBy: { nextDueDate: "asc" },
  });

  let processed = 0;

  for (const payment of duePayments) {
    const amount = Number(payment.amount);
    const accountId = payment.accountId;
    const occurrenceDate = payment.nextDueDate;
    const nextDueDate = getNextDueDate(occurrenceDate, payment.frequency);
    const isExpense = payment.type === TransactionType.EXPENSE;
    const isIncome = payment.type === TransactionType.INCOME;
    const { amountInBaseCurrency, exchangeRate } = await resolveBaseAmount({
      userId: payment.userId,
      accountId,
      amount,
    });

    const transaction = await db.$transaction(async (tx) => {
      const claim = await tx.recurringPayment.updateMany({
        where: {
          id: payment.id,
          isActive: true,
          nextDueDate: occurrenceDate,
        },
        data: { nextDueDate },
      });

      if (claim.count === 0) return null;

      return tx.transaction.create({
        data: {
          userId: payment.userId,
          type: payment.type,
          amount,
          amountInBaseCurrency,
          exchangeRate,
          date: occurrenceDate,
          comment: payment.comment,
          categoryId: payment.categoryId,
          fromAccountId: isExpense ? accountId : null,
          toAccountId: isIncome ? accountId : null,
          recurringPaymentId: payment.id,
          tags: payment.tags.length
            ? { create: payment.tags.map(({ tagId }) => ({ tagId })) }
            : undefined,
        },
      });
    });

    if (!transaction) continue;

    processed += 1;
    await sendPushNotificationToUser(payment.userId, {
      title: "Recurring payment processed",
      body: `${payment.comment ?? "Recurring payment"} - ${amount.toFixed(2)}`,
      url: `/transactions/${transaction.id}`,
    });
  }

  return processed;
}
