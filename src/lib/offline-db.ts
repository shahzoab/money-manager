import Dexie, { type EntityTable } from "dexie";

export type OfflineTransaction = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  toAmount?: number;
  date: string;
  comment?: string;
  photoUrl?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  synced: boolean;
  pendingAction?: "create" | "update" | "delete";
};

export type OfflineAccount = {
  id: string;
  userId: string;
  name: string;
  currency: string;
  color: string;
  icon: string;
  balance: number;
  isDefault: boolean;
  sortOrder: number;
  isHidden: boolean;
  synced: boolean;
};

export type OfflineCategory = {
  id: string;
  userId: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  sortOrder: number;
};

export type OfflineCommentSuggestion = {
  text: string;
  userId: string;
};

export const OFFLINE_QUEUE_CHANGED_EVENT = "offline-queue-changed";

class MoneyManagerDB extends Dexie {
  transactions!: EntityTable<OfflineTransaction, "id">;
  accounts!: EntityTable<OfflineAccount, "id">;
  categories!: EntityTable<OfflineCategory, "id">;
  commentSuggestions!: EntityTable<OfflineCommentSuggestion, "text">;
  syncMeta!: EntityTable<{ key: string; value: string }, "key">;

  constructor() {
    super("MoneyManagerDB");
    this.version(1).stores({
      transactions: "id, userId, date, synced",
      accounts: "id, userId, synced",
      syncMeta: "key",
    });
    this.version(2).stores({
      transactions: "id, userId, date, synced, pendingAction",
      accounts: "id, userId, synced",
      categories: "id, userId, type",
      commentSuggestions: "text, userId",
      syncMeta: "key",
    });
  }
}

export const offlineDb =
  typeof window !== "undefined" ? new MoneyManagerDB() : null;

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export function getSyncStatus(): SyncStatus {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return "synced";
}

export function dispatchOfflineQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT));
  }
}
