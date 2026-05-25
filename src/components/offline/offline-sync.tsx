"use client";

import { useEffect } from "react";
import { offlineDb } from "@/lib/offline-db";

type OfflineSyncProps = {
  userId: string;
  accounts: Array<{ id: string; name: string; currency: string; color: string; balance: number }>;
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

export function OfflineSync({ userId, accounts, transactions }: OfflineSyncProps) {
  useEffect(() => {
    if (!offlineDb) return;

    const db = offlineDb;
    if (!db) return;

    async function syncCache() {
      await db.syncMeta.put({ key: "lastSync", value: new Date().toISOString() });

      for (const account of accounts) {
        await db.accounts.put({
          id: account.id,
          userId,
          name: account.name,
          currency: account.currency,
          color: account.color,
          balance: account.balance,
          synced: true,
        });
      }

      for (const tx of transactions) {
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
  }, [userId, accounts, transactions]);

  return null;
}
