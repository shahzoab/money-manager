"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OFFLINE_QUEUE_CHANGED_EVENT } from "@/lib/offline-db";
import { getPendingTransactionRows } from "@/lib/offline-data";
import {
  TransactionList,
  type TransactionRow,
} from "@/components/transactions/transaction-list";

type TransactionListWithOfflineProps = {
  transactions: TransactionRow[];
  currency: string;
  showYear?: boolean;
};

export function TransactionListWithOffline({
  transactions,
  currency,
  showYear,
}: TransactionListWithOfflineProps) {
  const [pendingRows, setPendingRows] = useState<TransactionRow[]>([]);

  const loadPending = useCallback(async () => {
    const rows = await getPendingTransactionRows();
    setPendingRows(rows);
  }, []);

  useEffect(() => {
    void loadPending();
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, loadPending);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, loadPending);
    };
  }, [loadPending]);

  const mergedTransactions = useMemo(() => {
    const serverIds = new Set(transactions.map((tx) => tx.id));
    const uniquePending = pendingRows.filter((tx) => !serverIds.has(tx.id));
    return [...uniquePending, ...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [transactions, pendingRows]);

  return (
    <TransactionList
      transactions={mergedTransactions}
      currency={currency}
      showYear={showYear}
    />
  );
}
