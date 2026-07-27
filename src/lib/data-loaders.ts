import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { addDays } from "date-fns";
import {
  TransactionType,
  type CategoryType,
  type Prisma,
} from "@/generated/prisma/client";
import { activeWalletAccountWhere } from "@/lib/accounts";
import {
  USER_CACHE_REVALIDATE_SECONDS,
  userCacheTag,
  userCacheTags,
} from "@/lib/cache-tags";
import { db } from "@/lib/db";
import {
  serializeAccount,
  serializeCategory,
  serializeRecurringPayment,
  serializeTransaction,
} from "@/lib/serialize";
import { buildDateFilter } from "@/lib/periods";
import { buildTransactionSummary } from "@/lib/transaction-summary";
import { reportableTransactionWhere } from "@/lib/transaction-reports";
import { filterUpcomingPayments } from "@/lib/recurring-utils";

function cachedUserRead<T>(
  namespace: string,
  userId: string,
  keyParts: string[],
  tags: string[],
  read: () => Promise<T>,
): Promise<T> {
  return unstable_cache(
    read,
    [namespace, userId, ...keyParts],
    {
      revalidate: USER_CACHE_REVALIDATE_SECONDS,
      tags,
    },
  )();
}

export const loadUserSettings = cache(async (userId: string) =>
  cachedUserRead(
    "settings",
    userId,
    [],
    [userCacheTag(userId, "settings")],
    () => db.userSettings.findUnique({ where: { userId } }),
  ),
);

export const loadUserAccountSnapshot = cache(async (userId: string) =>
  cachedUserRead(
    "account-snapshot",
    userId,
    [],
    userCacheTags(userId, ["accounts", "transactions"]),
    () =>
      db.walletAccount.findMany({
        where: { userId, ...activeWalletAccountWhere },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          transactionsFrom: {
            select: {
              id: true,
              type: true,
              amount: true,
              toAmount: true,
              fromAccountId: true,
              toAccountId: true,
            },
          },
          transactionsTo: {
            select: {
              id: true,
              type: true,
              amount: true,
              toAmount: true,
              fromAccountId: true,
              toAccountId: true,
            },
          },
        },
      }),
  ),
);

export const loadUserAccounts = cache(async (userId: string) => {
  const snapshot = await loadUserAccountSnapshot(userId);
  return snapshot.map(({ transactionsFrom, transactionsTo, ...account }) => {
    void transactionsFrom;
    void transactionsTo;
    return serializeAccount(account);
  });
});

export const loadUserCategories = cache(
  async (userId: string, type?: CategoryType) =>
    cachedUserRead(
      "categories",
      userId,
      [type ?? "all"],
      [userCacheTag(userId, "categories")],
      async () => {
        const categories = await db.category.findMany({
          where: { userId, ...(type ? { type } : {}) },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
        return categories.map(serializeCategory);
      },
    ),
);

export const loadUserTags = cache(async (userId: string) =>
  cachedUserRead(
    "tags",
    userId,
    [],
    [userCacheTag(userId, "tags")],
    () =>
      db.tag.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
  ),
);

export const loadCommentSuggestions = cache(
  async (userId: string, query?: string) =>
    cachedUserRead(
      "comments",
      userId,
      [query ?? ""],
      userCacheTags(userId, ["comments", "transactions"]),
      async () => {
        const comments = await db.transaction.findMany({
          where: {
            userId,
            comment: query
              ? { contains: query, mode: "insensitive" }
              : { not: null },
          },
          select: { comment: true },
          orderBy: { date: "desc" },
          distinct: ["comment"],
          take: 10,
        });
        return comments.map((item) => item.comment).filter(Boolean) as string[];
      },
    ),
);

export const loadActiveRecurringPayments = cache(
  async (userId: string, search?: string) =>
    cachedUserRead(
      "recurring",
      userId,
      [search ?? ""],
      userCacheTags(userId, ["recurring", "accounts", "categories", "tags"]),
      async () => {
        const payments = await db.recurringPayment.findMany({
          where: {
            userId,
            isActive: true,
            ...(search
              ? { comment: { contains: search, mode: "insensitive" } }
              : {}),
          },
          include: {
            category: true,
            account: true,
            tags: { include: { tag: true } },
          },
          orderBy: { nextDueDate: "asc" },
        });
        return payments.map(serializeRecurringPayment);
      },
    ),
);

export async function loadUpcomingRecurringPayments(
  userId: string,
  days = 30,
) {
  const payments = await loadActiveRecurringPayments(userId);
  const until = addDays(new Date(), days);
  return filterUpcomingPayments(payments, until);
}

export const loadPeriodTransactions = cache(
  async (
    userId: string,
    fromIso: string,
    toIso: string,
    accountId: string,
  ) =>
    cachedUserRead(
      "period-transactions",
      userId,
      [fromIso, toIso, accountId],
      userCacheTags(userId, [
        "transactions",
        "accounts",
        "categories",
        "tags",
      ]),
      async () => {
        const from = fromIso ? new Date(fromIso) : undefined;
        const to = toIso ? new Date(toIso) : undefined;
        const transactions = await db.transaction.findMany({
          where: {
            userId,
            ...buildDateFilter(from, to),
            ...(accountId
              ? {
                  OR: [
                    { fromAccountId: accountId },
                    { toAccountId: accountId },
                  ],
                }
              : {}),
          },
          include: {
            category: true,
            fromAccount: true,
            toAccount: true,
            tags: { include: { tag: true } },
          },
          orderBy: { date: "desc" },
        });
        return transactions.map(serializeTransaction);
      },
    ),
);

export const loadFilteredTransactions = cache(
  async (
    userId: string,
    search: string,
    accountId: string,
    categoryId: string,
    type: TransactionType | "",
    fromIso: string,
    toIso: string,
    sortBy: "date" | "amount",
    sortOrder: "asc" | "desc",
    limit: number,
    offset: number,
  ) =>
    cachedUserRead(
      "filtered-transactions",
      userId,
      [
        search,
        accountId,
        categoryId,
        type,
        fromIso,
        toIso,
        sortBy,
        sortOrder,
        String(limit),
        String(offset),
      ],
      userCacheTags(userId, [
        "transactions",
        "accounts",
        "categories",
        "tags",
        "settings",
      ]),
      async () => {
        const andConditions: Prisma.TransactionWhereInput[] = [];
        if (accountId) {
          andConditions.push({
            OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
          });
        }
        if (search) {
          andConditions.push({
            comment: { contains: search, mode: "insensitive" },
          });
        }

        const where: Prisma.TransactionWhereInput = {
          userId,
          ...(type && { type }),
          ...(categoryId && { categoryId }),
          ...buildDateFilter(
            fromIso ? new Date(fromIso) : undefined,
            toIso ? new Date(toIso) : undefined,
          ),
          ...(andConditions.length ? { AND: andConditions } : {}),
        };
        const orderBy: Prisma.TransactionOrderByWithRelationInput =
          sortBy === "amount"
            ? { amount: sortOrder }
            : { date: sortOrder };

        const [transactions, total, aggregates, settings] =
          await db.$transaction([
            db.transaction.findMany({
              where,
              include: {
                category: true,
                fromAccount: true,
                toAccount: true,
                tags: { include: { tag: true } },
              },
              orderBy,
              take: limit,
              skip: offset,
            }),
            db.transaction.count({ where }),
            db.transaction.groupBy({
              by: ["type"],
              orderBy: { type: "asc" },
              where: { ...where, ...reportableTransactionWhere },
              _sum: { amountInBaseCurrency: true },
            }),
            db.userSettings.findUnique({
              where: { userId },
              select: { defaultCurrency: true },
            }),
          ]);

        return {
          transactions: transactions.map(serializeTransaction),
          total,
          baseCurrency: settings?.defaultCurrency ?? "USD",
          summary: buildTransactionSummary(aggregates),
        };
      },
    ),
);

export const loadTransactionById = cache(
  async (userId: string, transactionId: string) =>
    cachedUserRead(
      "transaction",
      userId,
      [transactionId],
      userCacheTags(userId, [
        "transactions",
        "accounts",
        "categories",
        "tags",
      ]),
      async () => {
        const transaction = await db.transaction.findFirstOrThrow({
          where: { id: transactionId, userId },
          include: {
            category: true,
            fromAccount: true,
            toAccount: true,
            tags: { include: { tag: true } },
          },
        });
        return serializeTransaction(transaction);
      },
    ),
);
