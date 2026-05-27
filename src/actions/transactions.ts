"use server";

import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { TransactionType, type Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { assertActiveWalletAccounts } from "@/lib/accounts";
import { db } from "@/lib/db";
import { convertAmount } from "@/lib/currency";
import { serializeTransaction } from "@/lib/serialize";
import { buildTransactionSummary } from "@/lib/transaction-summary";
import { reportableTransactionWhere } from "@/lib/transaction-reports";

const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  date: z.coerce.date(),
  comment: z.string().optional(),
  photoUrl: z.string().optional(),
  categoryId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  isReconciliation: z.boolean().optional(),
});

const transactionInclude = {
  category: true,
  fromAccount: true,
  toAccount: true,
  tags: { include: { tag: true } },
} as const;

async function computeBaseCurrencyAmount(
  baseCurrency: string,
  data: {
    type: TransactionType;
    amount: number;
    fromAccountId?: string | null;
    toAccountId?: string | null;
  },
) {
  let amountInBaseCurrency = data.amount;
  let exchangeRate: number | undefined;

  if (data.type === TransactionType.TRANSFER && data.fromAccountId && data.toAccountId) {
    const [fromAccount, toAccount] = await Promise.all([
      db.walletAccount.findUnique({ where: { id: data.fromAccountId } }),
      db.walletAccount.findUnique({ where: { id: data.toAccountId } }),
    ]);
    if (fromAccount && fromAccount.currency !== baseCurrency) {
      const result = await convertAmount(data.amount, fromAccount.currency, baseCurrency);
      amountInBaseCurrency = result.converted;
      exchangeRate = result.rate;
    } else if (toAccount && toAccount.currency !== baseCurrency) {
      const result = await convertAmount(data.amount, toAccount.currency, baseCurrency);
      amountInBaseCurrency = result.converted;
      exchangeRate = result.rate;
    }
  } else {
    const accountId = data.fromAccountId ?? data.toAccountId;
    if (accountId) {
      const account = await db.walletAccount.findUnique({ where: { id: accountId } });
      if (account && account.currency !== baseCurrency) {
        const result = await convertAmount(data.amount, account.currency, baseCurrency);
        amountInBaseCurrency = result.converted;
        exchangeRate = result.rate;
      }
    }
  }

  return { amountInBaseCurrency, exchangeRate };
}

export async function recalculateStaleBaseCurrencyAmounts(userId: string, baseCurrency: string) {
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      OR: [{ exchangeRate: null }, { exchangeRate: 1 }],
    },
    select: {
      id: true,
      type: true,
      amount: true,
      fromAccountId: true,
      toAccountId: true,
      fromAccount: { select: { currency: true } },
      toAccount: { select: { currency: true } },
    },
  });

  for (const tx of transactions) {
    const accountCurrency =
      tx.type === TransactionType.INCOME
        ? tx.toAccount?.currency
        : tx.type === TransactionType.EXPENSE
          ? tx.fromAccount?.currency
          : tx.fromAccount?.currency ?? tx.toAccount?.currency;

    if (!accountCurrency || accountCurrency === baseCurrency) continue;

    const { amountInBaseCurrency, exchangeRate } = await computeBaseCurrencyAmount(
      baseCurrency,
      {
        type: tx.type,
        amount: Number(tx.amount),
        fromAccountId: tx.fromAccountId,
        toAccountId: tx.toAccountId,
      },
    );

    if (exchangeRate && exchangeRate !== 1) {
      await db.transaction.update({
        where: { id: tx.id },
        data: { amountInBaseCurrency, exchangeRate },
      });
    }
  }
}

export async function getTransactions(filters?: {
  search?: string;
  accountId?: string;
  type?: TransactionType;
  from?: Date;
  to?: Date;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  await connection();
  const session = await requireSession();
  const settings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  const baseCurrency = settings?.defaultCurrency ?? "USD";

  const andConditions: Prisma.TransactionWhereInput[] = [];

  if (filters?.accountId) {
    andConditions.push({
      OR: [
        { fromAccountId: filters.accountId },
        { toAccountId: filters.accountId },
      ],
    });
  }

  if (filters?.search) {
    andConditions.push({
      OR: [
        { comment: { contains: filters.search, mode: "insensitive" } },
        { category: { name: { contains: filters.search, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    ...(filters?.type && { type: filters.type }),
    ...(filters?.from || filters?.to
      ? {
          date: {
            ...(filters.from && { gte: filters.from }),
            ...(filters.to && { lte: filters.to }),
          },
        }
      : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const sortOrder = filters?.sortOrder ?? "desc";
  const orderBy =
    filters?.sortBy === "amount"
      ? { amount: sortOrder }
      : { date: sortOrder };

  const [transactions, total, aggregates] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        tags: { include: { tag: true } },
      },
      orderBy,
      ...(filters?.limit != null ? { take: filters.limit } : {}),
      ...(filters?.offset != null ? { skip: filters.offset } : {}),
    }),
    db.transaction.count({ where }),
    db.transaction.groupBy({
      by: ["type"],
      where: { ...where, ...reportableTransactionWhere },
      _sum: { amountInBaseCurrency: true },
    }),
  ]);

  const summary = buildTransactionSummary(aggregates);

  return {
    transactions: transactions.map(serializeTransaction),
    total,
    baseCurrency,
    summary,
  };
}

export async function getTransaction(id: string) {
  await connection();
  const session = await requireSession();
  const transaction = await db.transaction.findFirstOrThrow({
    where: { id, userId: session.user.id },
    include: transactionInclude,
  });
  return serializeTransaction(transaction);
}

export async function createTransaction(input: z.infer<typeof transactionSchema>) {
  const session = await requireSession();
  const data = transactionSchema.parse(input);

  await assertActiveWalletAccounts(session.user.id, [
    data.fromAccountId,
    data.toAccountId,
  ]);

  const settings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  const baseCurrency = settings?.defaultCurrency ?? "USD";
  const { amountInBaseCurrency, exchangeRate } = await computeBaseCurrencyAmount(baseCurrency, data);

  const transaction = await db.transaction.create({
    data: {
      userId: session.user.id,
      type: data.type,
      amount: data.amount,
      amountInBaseCurrency,
      exchangeRate,
      date: data.date,
      comment: data.comment,
      photoUrl: data.photoUrl,
      categoryId: data.categoryId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      isReconciliation: data.isReconciliation ?? false,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/charts");
  return transaction;
}

export async function updateTransaction(
  id: string,
  input: Partial<z.infer<typeof transactionSchema>>,
) {
  const session = await requireSession();
  const data = transactionSchema.partial().parse(input);

  await assertActiveWalletAccounts(session.user.id, [
    data.fromAccountId,
    data.toAccountId,
  ]);

  const existing = await db.transaction.findFirstOrThrow({
    where: { id, userId: session.user.id },
  });

  const merged = {
    type: data.type ?? existing.type,
    amount: data.amount ?? Number(existing.amount),
    fromAccountId:
      data.fromAccountId !== undefined ? data.fromAccountId : existing.fromAccountId,
    toAccountId: data.toAccountId !== undefined ? data.toAccountId : existing.toAccountId,
  };

  const shouldRecalculate =
    data.amount !== undefined ||
    data.type !== undefined ||
    data.fromAccountId !== undefined ||
    data.toAccountId !== undefined;

  let amountInBaseCurrency: number | undefined;
  let exchangeRate: number | undefined;

  if (shouldRecalculate) {
    const settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    });
    const baseCurrency = settings?.defaultCurrency ?? "USD";
    const converted = await computeBaseCurrencyAmount(baseCurrency, merged);
    amountInBaseCurrency = converted.amountInBaseCurrency;
    exchangeRate = converted.exchangeRate;
  }

  const transaction = await db.$transaction(async (tx) => {
    if (data.tagIds !== undefined) {
      await tx.transactionTag.deleteMany({ where: { transactionId: id } });
    }

    return tx.transaction.update({
      where: { id, userId: session.user.id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date && { date: data.date }),
        ...(data.comment !== undefined && { comment: data.comment }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.fromAccountId !== undefined && { fromAccountId: data.fromAccountId }),
        ...(data.toAccountId !== undefined && { toAccountId: data.toAccountId }),
        ...(shouldRecalculate && {
          amountInBaseCurrency,
          exchangeRate: exchangeRate ?? null,
        }),
        ...(data.tagIds !== undefined && {
          tags: data.tagIds.length
            ? { create: data.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        }),
      },
      include: transactionInclude,
    });
  });

  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/charts");
  return serializeTransaction(transaction);
}

export async function deleteTransaction(id: string) {
  const session = await requireSession();
  await db.transaction.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/charts");
}

export async function getCommentSuggestions(query?: string) {
  const session = await requireSession();
  const comments = await db.transaction.findMany({
    where: {
      userId: session.user.id,
      comment: query
        ? { contains: query, mode: "insensitive" }
        : { not: null },
    },
    select: { comment: true },
    orderBy: { date: "desc" },
    distinct: ["comment"],
    take: 10,
  });
  return comments.map((c) => c.comment).filter(Boolean) as string[];
}
