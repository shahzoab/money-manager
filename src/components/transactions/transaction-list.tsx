"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { TransactionType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { listTextClass } from "@/lib/form-field-styles";
import { formatMoney, wholeNumberFormat } from "@/lib/currency-format";
import { cn } from "@/lib/utils";
import { EntityBadge } from "@/components/ui/entity-badge";
import { deleteTransaction } from "@/actions/transactions";
import { toast } from "sonner";

export type TransactionRow = {
  id: string;
  type: TransactionType;
  amount: unknown;
  toAmount?: number | null;
  date: Date | string;
  comment: string | null;
  isReconciliation?: boolean;
  isPending?: boolean;
  category: { name: string; color: string; icon: string } | null;
  fromAccount: { name: string; currency: string } | null;
  toAccount: { name: string; currency: string } | null;
  tags: { tag: { name: string; color: string } }[];
};

type TransactionListProps = {
  transactions: TransactionRow[];
  currency: string;
  showYear?: boolean;
};

export function TransactionList({ transactions, currency, showYear = false }: TransactionListProps) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No transactions yet.{" "}
        <Link href="/transactions/new" className="text-accent hover:underline">
          Add one
        </Link>{" "}
        or press <kbd className="rounded bg-surface-elevated px-1.5 py-0.5">N</kbd>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className={cn("w-full min-w-0", listTextClass)}>
          <thead>
            <tr className="border-b border-border bg-surface-elevated text-left text-sm uppercase tracking-wider text-muted-foreground lg:text-xs">
              <th className="px-3 py-4 sm:px-4 lg:py-3">Date</th>
              <th className="px-3 py-4 sm:px-4 lg:py-3">Description</th>
              <th className="hidden px-4 py-4 md:table-cell lg:py-3">Category</th>
              <th className="hidden px-4 py-4 sm:table-cell lg:py-3">Account</th>
              <th className="px-3 py-4 text-right sm:px-4 lg:py-3">Amount</th>
              <th className="hidden w-20 px-4 py-4 sm:table-cell lg:py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr
                key={tx.id}
                className={cn(
                  "border-b border-border/50 transition-colors",
                  tx.isPending
                    ? "cursor-default opacity-90"
                    : "cursor-pointer hover:bg-surface-elevated/50 active:bg-surface-elevated",
                  i % 2 === 0 ? "bg-surface" : "bg-surface/50",
                )}
                onClick={() => {
                  if (tx.isPending) {
                    toast.message("Waiting to sync");
                    return;
                  }
                  router.push(`/transactions/${tx.id}`);
                }}
              >
                <td className="whitespace-nowrap px-3 py-4 tabular-nums text-muted-foreground sm:px-4 lg:py-3">
                  {format(new Date(tx.date), showYear ? "MMM d, yyyy" : "MMM d")}
                </td>
                <td className="max-w-[120px] truncate px-3 py-4 sm:max-w-none sm:px-4 lg:py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-medium">{tx.comment || "—"}</div>
                    {tx.isPending && (
                      <span className="shrink-0 rounded bg-yellow-500/15 px-1.5 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                        Pending sync
                      </span>
                    )}
                    {tx.isReconciliation && (
                      <span className="shrink-0 rounded bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">
                        Reconciliation
                      </span>
                    )}
                  </div>
                  {tx.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tx.tags.map(({ tag }) => (
                        <span
                          key={tag.name}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{ background: `${tag.color}22`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="hidden px-4 py-4 md:table-cell lg:py-3">
                  {tx.isReconciliation && !tx.category ? (
                    <span className="text-sm text-muted-foreground">Balance adjustment</span>
                  ) : tx.category ? (
                    <EntityBadge icon={tx.category.icon} color={tx.category.color} size="sm">
                      {tx.category.name}
                    </EntityBadge>
                  ) : null}
                </td>
                <td className="hidden px-4 py-4 text-muted-foreground sm:table-cell lg:py-3">
                  {tx.type === TransactionType.TRANSFER
                    ? `${tx.fromAccount?.name} → ${tx.toAccount?.name}`
                    : tx.fromAccount?.name ?? tx.toAccount?.name ?? "—"}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-4 text-right text-base font-semibold tabular-nums sm:px-4 lg:py-3 lg:text-sm ${
                    tx.type === TransactionType.INCOME
                      ? "text-accent-secondary"
                      : tx.type === TransactionType.EXPENSE
                        ? "text-foreground"
                        : "text-accent"
                  }`}
                >
                  {tx.type === TransactionType.INCOME ? "+" : tx.type === TransactionType.EXPENSE ? "-" : ""}
                  {tx.type === TransactionType.TRANSFER &&
                  tx.fromAccount &&
                  tx.toAccount &&
                  tx.fromAccount.currency !== tx.toAccount.currency ? (
                    <span className="text-sm">
                      {formatMoney(Number(tx.amount), tx.fromAccount.currency, wholeNumberFormat)}
                      <span className="mx-1 text-muted-foreground">→</span>
                      {formatMoney(
                        Number(tx.toAmount ?? tx.amount),
                        tx.toAccount.currency,
                        wholeNumberFormat,
                      )}
                    </span>
                  ) : (
                    formatMoney(
                      Number(tx.amount),
                      tx.fromAccount?.currency ?? tx.toAccount?.currency ?? currency,
                      wholeNumberFormat,
                    )
                  )}
                </td>
                <td className="hidden px-4 py-4 sm:table-cell lg:py-3">
                  {!tx.isPending && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/transactions/${tx.id}/edit`);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400"
                        aria-label="Delete transaction"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(tx.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete Transaction"
        description="This transaction will be permanently deleted."
        loading={deleting}
        onConfirm={() => {
          if (!pendingDelete) return;
          startDeleteTransition(async () => {
            await deleteTransaction(pendingDelete);
            setPendingDelete(null);
            toast.success("Transaction deleted");
          });
        }}
      />
    </>
  );
}
