"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTransactionsBatch } from "@/actions/transactions";
import { OFFLINE_QUEUE_CHANGED_EVENT } from "@/lib/offline-db";
import {
  getPendingTransactions,
  pendingTransactionToCreateInput,
  removePendingTransaction,
} from "@/lib/offline-data";

export const OFFLINE_SYNC_STATUS_EVENT = "offline-sync-status";

export type OfflineSyncStatus = "synced" | "syncing" | "offline" | "error";

function dispatchSyncStatus(status: OfflineSyncStatus) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_SYNC_STATUS_EVENT, { detail: status }),
    );
  }
}

export function OfflineQueueSync() {
  const router = useRouter();
  const flushingRef = useRef(false);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || flushingRef.current) return;

    const pending = await getPendingTransactions();
    if (pending.length === 0) {
      dispatchSyncStatus(navigator.onLine ? "synced" : "offline");
      return;
    }

    flushingRef.current = true;
    dispatchSyncStatus("syncing");

    let hadError = false;
    try {
      await createTransactionsBatch(
        pending.map((transaction) =>
          pendingTransactionToCreateInput(transaction),
        ),
      );
      for (const transaction of pending) {
        await removePendingTransaction(transaction.id);
      }
    } catch {
      hadError = true;
    }

    flushingRef.current = false;
    dispatchSyncStatus(hadError ? "error" : navigator.onLine ? "synced" : "offline");
    router.refresh();
  }, [router]);

  useEffect(() => {
    const handleOnline = () => {
      void flushQueue();
    };

    const handleOffline = () => {
      dispatchSyncStatus("offline");
    };

    void flushQueue();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue]);

  useEffect(() => {
    const handleQueueChanged = () => {
      void flushQueue();
    };

    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged);
    };
  }, [flushQueue]);

  return null;
}
