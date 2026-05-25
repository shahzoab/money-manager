"use client";

import { Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { TransactionType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency-format";
import { duplicateTransaction, deleteTransaction } from "@/actions/transactions";
import { toast } from "sonner";

type TransactionRow = {
  id: string;
  type: TransactionType;
  amount: unknown;
  date: Date;
  comment: string | null;
  category: { name: string; color: string } | null;
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

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No transactions yet. Press <kbd className="rounded bg-surface-elevated px-1.5 py-0.5">N</kbd> to add one.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            <th className="hidden px-4 py-3 md:table-cell">Category</th>
            <th className="hidden px-4 py-3 sm:table-cell">Account</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 w-20" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr
              key={tx.id}
              className={`border-b border-border/50 ${i % 2 === 0 ? "bg-surface" : "bg-surface/50"}`}
            >
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {format(new Date(tx.date), showYear ? "MMM d, yyyy" : "MMM d")}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{tx.comment || "—"}</div>
                {tx.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tx.tags.map(({ tag }) => (
                      <span
                        key={tag.name}
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{ background: `${tag.color}22`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                {tx.category && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: tx.category.color }}
                    />
                    {tx.category.name}
                  </span>
                )}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {tx.type === TransactionType.TRANSFER
                  ? `${tx.fromAccount?.name} → ${tx.toAccount?.name}`
                  : tx.fromAccount?.name ?? tx.toAccount?.name ?? "—"}
              </td>
              <td
                className={`px-4 py-3 text-right font-semibold tabular-nums ${
                  tx.type === TransactionType.INCOME
                    ? "text-accent-secondary"
                    : tx.type === TransactionType.EXPENSE
                      ? "text-foreground"
                      : "text-accent"
                }`}
              >
                {tx.type === TransactionType.INCOME ? "+" : tx.type === TransactionType.EXPENSE ? "-" : ""}
                {formatMoney(Number(tx.amount), tx.fromAccount?.currency ?? tx.toAccount?.currency ?? currency)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      await duplicateTransaction(tx.id);
                      router.refresh();
                      toast.success("Transaction duplicated");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400"
                    onClick={async () => {
                      await deleteTransaction(tx.id);
                      router.refresh();
                      toast.success("Transaction deleted");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
