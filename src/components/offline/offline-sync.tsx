"use client";

import { useEffect } from "react";
import { offlineDb } from "@/lib/offline-db";

type OfflineSyncProps = {
  userId: string;
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    color: string;
    icon: string;
    balance: number;
    isDefault: boolean;
    sortOrder: number;
    isHidden: boolean;
  }>;
  categories: Array<{
    id: string;
    name: string;
    type: string;
    icon: string;
    color: string;
    sortOrder: number;
  }>;
  comments: string[];
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    comment?: string | null;
    categoryId?: string | null;
    fromAccountId?: string | null;
    toAccountId?: string | null;
  }>;
};

export function OfflineSync({
  userId,
  accounts,
  categories,
  comments,
  transactions,
}: OfflineSyncProps) {
  useEffect(() => {
    if (!offlineDb) return;

    const db = offlineDb;

    async function syncCache() {
      await db.syncMeta.put({ key: "userId", value: userId });
      await db.syncMeta.put({ key: "lastSync", value: new Date().toISOString() });

      const cachedAccountIds = new Set(accounts.map((a) => a.id));
      for (const account of accounts) {
        await db.accounts.put({
          id: account.id,
          userId,
          name: account.name,
          currency: account.currency,
          color: account.color,
          icon: account.icon,
          balance: account.balance,
          isDefault: account.isDefault,
          sortOrder: account.sortOrder,
          isHidden: account.isHidden,
          synced: true,
        });
      }

      const existingAccounts = await db.accounts.where("userId").equals(userId).toArray();
      for (const account of existingAccounts) {
        if (!cachedAccountIds.has(account.id)) {
          await db.accounts.delete(account.id);
        }
      }

      const cachedCategoryIds = new Set(categories.map((c) => c.id));
      for (const category of categories) {
        await db.categories.put({
          id: category.id,
          userId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
        });
      }

      const existingCategories = await db.categories.where("userId").equals(userId).toArray();
      for (const category of existingCategories) {
        if (!cachedCategoryIds.has(category.id)) {
          await db.categories.delete(category.id);
        }
      }

      await db.commentSuggestions.where("userId").equals(userId).delete();
      for (const text of comments) {
        if (text) {
          await db.commentSuggestions.put({ text, userId });
        }
      }

      for (const tx of transactions) {
        if (tx.id.startsWith("pending-")) continue;
        const existing = await db.transactions.get(tx.id);
        if (existing?.pendingAction === "create") continue;

        await db.transactions.put({
          id: tx.id,
          userId,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          comment: tx.comment ?? undefined,
          categoryId: tx.categoryId ?? undefined,
          fromAccountId: tx.fromAccountId ?? undefined,
          toAccountId: tx.toAccountId ?? undefined,
          synced: true,
        });
      }
    }

    syncCache().catch(() => {});
  }, [userId, accounts, categories, comments, transactions]);

  return null;
}
