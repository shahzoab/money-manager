import Dexie, { type EntityTable } from "dexie";

export type OfflineTransaction = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  date: string;
  comment?: string;
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
  synced: boolean;
};

class MoneyManagerDB extends Dexie {
  transactions!: EntityTable<OfflineTransaction, "id">;
  accounts!: EntityTable<OfflineAccount, "id">;
  syncMeta!: EntityTable<{ key: string; value: string }, "key">;

  constructor() {
    super("MoneyManagerDB");
    this.version(1).stores({
      transactions: "id, userId, date, synced",
      accounts: "id, userId, synced",
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
