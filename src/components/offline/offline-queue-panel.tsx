"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CloudOff } from "lucide-react";
import { TransactionType } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OFFLINE_QUEUE_CHANGED_EVENT } from "@/lib/offline-db";
import {
  getPendingTransactionRows,
  type PendingTransactionRow,
} from "@/lib/offline-data";
import { formatMoney, wholeNumberFormat } from "@/lib/currency-format";
import { cn } from "@/lib/utils";

function amountCurrency(row: PendingTransactionRow) {
  return row.fromAccount?.currency ?? row.toAccount?.currency ?? "USD";
}

export function OfflineQueuePanel() {
  const [pendingRows, setPendingRows] = useState<PendingTransactionRow[]>([]);

  const refreshPendingRows = useCallback(async () => {
    const rows = await getPendingTransactionRows();
    setPendingRows(rows);
  }, []);

  useEffect(() => {
    const refresh = () => {
      void refreshPendingRows();
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [refreshPendingRows]);

  if (pendingRows.length === 0) return null;

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/10">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base text-yellow-700 dark:text-yellow-300">
          <CloudOff className="h-4 w-4" />
          Pending Offline Sync
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {pendingRows.length} transaction{pendingRows.length === 1 ? "" : "s"} will sync
          automatically when the app is online.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingRows.slice(0, 5).map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/20 bg-background/60 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{row.comment || "Pending transaction"}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(row.date), "MMM d")} ·{" "}
                {row.category?.name ?? row.fromAccount?.name ?? row.toAccount?.name ?? "Uncategorized"}
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                row.type === TransactionType.INCOME && "text-accent-secondary",
                row.type === TransactionType.TRANSFER && "text-accent",
              )}
            >
              {row.type === TransactionType.INCOME
                ? "+"
                : row.type === TransactionType.EXPENSE
                  ? "-"
                  : ""}
              {formatMoney(Number(row.amount), amountCurrency(row), wholeNumberFormat)}
            </p>
          </div>
        ))}
        {pendingRows.length > 5 && (
          <p className="text-xs text-muted-foreground">
            {pendingRows.length - 5} more pending transaction
            {pendingRows.length - 5 === 1 ? "" : "s"} are shown in the list below.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
