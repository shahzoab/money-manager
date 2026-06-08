import type { TransactionType } from "@/generated/prisma/enums";
import type { TransactionFormSubmitData } from "@/components/transactions/transaction-form";
import {
  dispatchOfflineQueueChanged,
  offlineDb,
  type OfflineAccount,
  type OfflineCategory,
  type OfflineTransaction,
} from "@/lib/offline-db";

export type CachedAccount = {
  id: string;
  userId: string;
  name: string;
  currency: string;
  startingBalance: number;
  color: string;
  icon: string;
  isHidden: boolean;
  isDefault: boolean;
  sortOrder: number;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CachedCategory = {
  id: string;
  userId: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  monthlyLimit: number | null;
  isTemplate: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PendingTransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  toAmount?: number | null;
  date: Date;
  comment: string | null;
  isPending: true;
  category: { name: string; color: string; icon: string } | null;
  fromAccount: { name: string; currency: string } | null;
  toAccount: { name: string; currency: string } | null;
  tags: [];
};

async function getCurrentUserId(): Promise<string | null> {
  if (!offlineDb) return null;
  const meta = await offlineDb.syncMeta.get("userId");
  return meta?.value ?? null;
}

function mapAccount(account: OfflineAccount): CachedAccount {
  return {
    id: account.id,
    userId: account.userId,
    name: account.name,
    currency: account.currency,
    startingBalance: account.balance,
    color: account.color,
    icon: account.icon,
    isHidden: account.isHidden ?? false,
    isDefault: account.isDefault ?? false,
    sortOrder: account.sortOrder ?? 0,
    notes: null,
    deletedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function mapCategory(category: OfflineCategory): CachedCategory {
  return {
    id: category.id,
    userId: category.userId,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    monthlyLimit: null,
    isTemplate: false,
    sortOrder: category.sortOrder,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function getCachedAccounts(): Promise<CachedAccount[]> {
  if (!offlineDb) return [];
  const userId = await getCurrentUserId();
  const accounts = userId
    ? await offlineDb.accounts.where("userId").equals(userId).toArray()
    : await offlineDb.accounts.toArray();
  return accounts
    .filter((a) => !a.isHidden)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(mapAccount);
}

export async function getCachedCategories(): Promise<CachedCategory[]> {
  if (!offlineDb) return [];
  const userId = await getCurrentUserId();
  const categories = userId
    ? await offlineDb.categories.where("userId").equals(userId).toArray()
    : await offlineDb.categories.toArray();
  return categories
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(mapCategory);
}

export async function getCachedCommentSuggestions(query: string): Promise<string[]> {
  if (!offlineDb) return [];
  const userId = await getCurrentUserId();
  const suggestions = userId
    ? await offlineDb.commentSuggestions.where("userId").equals(userId).toArray()
    : await offlineDb.commentSuggestions.toArray();

  const normalized = query.trim().toLowerCase();
  return suggestions
    .map((s) => s.text)
    .filter((text) => !normalized || text.toLowerCase().includes(normalized))
    .slice(0, 10);
}

export async function queuePendingTransaction(
  data: TransactionFormSubmitData,
): Promise<string> {
  if (!offlineDb) throw new Error("Offline storage unavailable");

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("No cached user session for offline save");

  const id = crypto.randomUUID();
  const record: OfflineTransaction = {
    id,
    userId,
    type: data.type,
    amount: data.amount,
    toAmount: data.toAmount,
    date: data.date.toISOString(),
    comment: data.comment,
    photoUrl: data.photoUrl,
    categoryId: data.categoryId,
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    synced: false,
    pendingAction: "create",
  };

  await offlineDb.transactions.put(record);
  dispatchOfflineQueueChanged();
  return id;
}

export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  if (!offlineDb) return [];
  const userId = await getCurrentUserId();
  const pending = await offlineDb.transactions
    .filter(
      (tx) =>
        tx.synced === false &&
        tx.pendingAction === "create" &&
        (!userId || tx.userId === userId),
    )
    .toArray();
  return pending.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getPendingTransactionRows(): Promise<PendingTransactionRow[]> {
  const [pending, accounts, categories] = await Promise.all([
    getPendingTransactions(),
    getCachedAccounts(),
    getCachedCategories(),
  ]);

  return pending.map((tx) => {
    const category = categories.find((c) => c.id === tx.categoryId);
    const fromAccount = accounts.find((a) => a.id === tx.fromAccountId);
    const toAccount = accounts.find((a) => a.id === tx.toAccountId);

    return {
      id: tx.id,
      type: tx.type as TransactionType,
      amount: tx.amount,
      toAmount: tx.toAmount ?? null,
      date: new Date(tx.date),
      comment: tx.comment ?? null,
      isPending: true as const,
      category: category
        ? { name: category.name, color: category.color, icon: category.icon }
        : null,
      fromAccount: fromAccount
        ? { name: fromAccount.name, currency: fromAccount.currency }
        : null,
      toAccount: toAccount
        ? { name: toAccount.name, currency: toAccount.currency }
        : null,
      tags: [],
    };
  });
}

export async function removePendingTransaction(id: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.transactions.delete(id);
  dispatchOfflineQueueChanged();
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingTransactions();
  return pending.length;
}

export function pendingTransactionToCreateInput(tx: OfflineTransaction) {
  return {
    type: tx.type as TransactionType,
    amount: tx.amount,
    toAmount: tx.toAmount,
    date: new Date(tx.date),
    comment: tx.comment,
    photoUrl: tx.photoUrl,
    categoryId: tx.categoryId,
    fromAccountId: tx.fromAccountId,
    toAccountId: tx.toAccountId,
  };
}
