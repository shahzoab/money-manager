"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TransactionType } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { convertAmount } from "@/lib/currency";
import { serializeTransaction } from "@/lib/serialize";
import {
  loadCommentSuggestions,
  loadFilteredTransactions,
  loadTransactionById,
} from "@/lib/data-loaders";
import { expireUserCache } from "@/lib/cache-invalidation";
import { loadUserSettings } from "@/lib/data-loaders";
import { activeWalletAccountWhere } from "@/lib/accounts";

const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  toAmount: z.number().positive().optional(),
  date: z.coerce.date(),
  comment: z.string().optional(),
  photoUrl: z.string().optional(),
  categoryId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  isReconciliation: z.boolean().optional(),
});

export async function previewTransferConversion(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
): Promise<{ converted: number; rate: number }> {
  await requireSession();
  return convertAmount(amount, fromCurrency, toCurrency);
}

const transactionInclude = {
  category: true,
  fromAccount: true,
  toAccount: true,
  tags: { include: { tag: true } },
} as const;

export async function getTransactions(filters?: {
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: Date;
  to?: Date;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  const session = await requireSession();
  return loadFilteredTransactions(
    session.user.id,
    filters?.search ?? "",
    filters?.accountId ?? "",
    filters?.categoryId ?? "",
    filters?.type ?? "",
    filters?.from?.toISOString() ?? "",
    filters?.to?.toISOString() ?? "",
    filters?.sortBy ?? "date",
    filters?.sortOrder ?? "desc",
    filters?.limit ?? 50,
    filters?.offset ?? 0,
  );
}

export async function getTransaction(id: string) {
  const session = await requireSession();
  return loadTransactionById(session.user.id, id);
}

export async function createTransaction(input: z.infer<typeof transactionSchema>) {
  const transactions = await createTransactionsBatch([input]);
  return transactions[0];
}

export async function createTransactionsBatch(
  inputs: Array<z.infer<typeof transactionSchema>>,
) {
  const session = await requireSession();
  const rows = inputs.map((input) => transactionSchema.parse(input));
  if (rows.length === 0) return [];

  const accountIds = [
    ...new Set(
      rows.flatMap((row) => [row.fromAccountId, row.toAccountId]).filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const [settings, accounts] = await Promise.all([
    loadUserSettings(session.user.id),
    accountIds.length
      ? db.walletAccount.findMany({
          where: {
            id: { in: accountIds },
            userId: session.user.id,
            ...activeWalletAccountWhere,
          },
          select: { id: true, currency: true },
        })
      : Promise.resolve([]),
  ]);
  if (accounts.length !== accountIds.length) {
    throw new Error("Account not found");
  }

  const currencyByAccountId = new Map(
    accounts.map((account) => [account.id, account.currency]),
  );
  const baseCurrency = settings?.defaultCurrency ?? "USD";

  const prepared = [];
  for (const data of rows) {
    const fromCurrency = data.fromAccountId
      ? currencyByAccountId.get(data.fromAccountId)
      : undefined;
    const toCurrency = data.toAccountId
      ? currencyByAccountId.get(data.toAccountId)
      : undefined;
    let toAmount: number | undefined;
    if (
      data.type === TransactionType.TRANSFER &&
      fromCurrency &&
      toCurrency
    ) {
      toAmount =
        fromCurrency === toCurrency
          ? data.amount
          : data.toAmount ??
            (await convertAmount(data.amount, fromCurrency, toCurrency)).converted;
    }

    const sourceCurrency =
      data.type === TransactionType.INCOME ? toCurrency : fromCurrency;
    const converted =
      sourceCurrency && sourceCurrency !== baseCurrency
        ? await convertAmount(data.amount, sourceCurrency, baseCurrency)
        : { converted: data.amount, rate: 1 };

    prepared.push({
      data,
      toAmount,
      amountInBaseCurrency: converted.converted,
      exchangeRate:
        sourceCurrency && sourceCurrency !== baseCurrency
          ? converted.rate
          : undefined,
    });
  }

  const transactions = await db.$transaction(
    prepared.map(({ data, toAmount, amountInBaseCurrency, exchangeRate }) =>
      db.transaction.create({
        data: {
          userId: session.user.id,
          type: data.type,
          amount: data.amount,
          toAmount,
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
      }),
    ),
  );

  expireUserCache(session.user.id, ["transactions", "comments"]);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/charts");
  return transactions;
}

export async function updateTransaction(
  id: string,
  input: Partial<z.infer<typeof transactionSchema>>,
) {
  const session = await requireSession();
  const data = transactionSchema.partial().parse(input);

  const existing = await db.transaction.findFirstOrThrow({
    where: { id, userId: session.user.id },
  });

  const merged = {
    type: data.type ?? existing.type,
    amount: data.amount ?? Number(existing.amount),
    toAmount:
      data.toAmount !== undefined
        ? data.toAmount
        : existing.toAmount != null
          ? Number(existing.toAmount)
          : undefined,
    fromAccountId:
      data.fromAccountId !== undefined ? data.fromAccountId : existing.fromAccountId,
    toAccountId: data.toAccountId !== undefined ? data.toAccountId : existing.toAccountId,
  };

  const shouldRecalculate =
    data.amount !== undefined ||
    data.toAmount !== undefined ||
    data.type !== undefined ||
    data.fromAccountId !== undefined ||
    data.toAccountId !== undefined;

  let amountInBaseCurrency: number | undefined;
  let exchangeRate: number | undefined;
  let resolvedToAmount: number | undefined | null;

  if (shouldRecalculate) {
    const accountIds = [
      ...new Set(
        [merged.fromAccountId, merged.toAccountId].filter(
          (accountId): accountId is string => Boolean(accountId),
        ),
      ),
    ];
    const [settings, accounts] = await Promise.all([
      loadUserSettings(session.user.id),
      accountIds.length
        ? db.walletAccount.findMany({
            where: {
              id: { in: accountIds },
              userId: session.user.id,
              ...activeWalletAccountWhere,
            },
            select: { id: true, currency: true },
          })
        : Promise.resolve([]),
    ]);
    if (accounts.length !== accountIds.length) {
      throw new Error("Account not found");
    }

    const currencyByAccountId = new Map(
      accounts.map((account) => [account.id, account.currency]),
    );
    const baseCurrency = settings?.defaultCurrency ?? "USD";
    const fromCurrency = merged.fromAccountId
      ? currencyByAccountId.get(merged.fromAccountId)
      : undefined;
    const toCurrency = merged.toAccountId
      ? currencyByAccountId.get(merged.toAccountId)
      : undefined;
    const sourceCurrency =
      merged.type === TransactionType.INCOME ? toCurrency : fromCurrency;

    if (sourceCurrency && sourceCurrency !== baseCurrency) {
      const converted = await convertAmount(
        merged.amount,
        sourceCurrency,
        baseCurrency,
      );
      amountInBaseCurrency = converted.converted;
      exchangeRate = converted.rate;
    } else {
      amountInBaseCurrency = merged.amount;
    }

    if (
      merged.type === TransactionType.TRANSFER &&
      fromCurrency &&
      toCurrency
    ) {
      resolvedToAmount =
        fromCurrency === toCurrency
          ? merged.amount
          : merged.toAmount ??
            (await convertAmount(merged.amount, fromCurrency, toCurrency))
              .converted;
    } else {
      resolvedToAmount = null;
    }
  }

  const transaction = await db.transaction.update({
    where: { id, userId: session.user.id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(shouldRecalculate &&
        resolvedToAmount !== undefined && { toAmount: resolvedToAmount }),
      ...(data.date && { date: data.date }),
      ...(data.comment !== undefined && { comment: data.comment }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.fromAccountId !== undefined && {
        fromAccountId: data.fromAccountId,
      }),
      ...(data.toAccountId !== undefined && { toAccountId: data.toAccountId }),
      ...(shouldRecalculate && {
        amountInBaseCurrency,
        exchangeRate: exchangeRate ?? null,
      }),
      ...(data.tagIds !== undefined && {
        tags: {
          deleteMany: {},
          ...(data.tagIds.length
            ? { create: data.tagIds.map((tagId) => ({ tagId })) }
            : {}),
        },
      }),
    },
    include: transactionInclude,
  });

  expireUserCache(session.user.id, ["transactions", "comments"]);
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/charts");
  return serializeTransaction(transaction);
}

export async function deleteTransaction(id: string) {
  const session = await requireSession();
  await db.transaction.delete({ where: { id, userId: session.user.id } });
  expireUserCache(session.user.id, ["transactions", "comments"]);
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/charts");
}

export async function getCommentSuggestions(query?: string) {
  const session = await requireSession();
  return loadCommentSuggestions(session.user.id, query);
}
