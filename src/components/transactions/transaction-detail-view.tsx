"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { TransactionType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTransaction, getTransaction } from "@/actions/transactions";
import { formatMoney } from "@/lib/currency-format";
import {
  transactionTypeIcon,
  transactionTypeLabel,
  transactionTypeStyles,
} from "@/lib/transaction-type-styles";
import { cn } from "@/lib/utils";
import { EntityIcon } from "@/components/ui/entity-icon";
import { toast } from "sonner";

type TransactionDetail = Awaited<ReturnType<typeof getTransaction>>;

type TransactionDetailViewProps = {
  transaction: TransactionDetail;
  currency: string;
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function TransactionDetailView({ transaction, currency }: TransactionDetailViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const styles = transactionTypeStyles(transaction.type);
  const TypeIcon = transactionTypeIcon(transaction.type);
  const accountCurrency =
    transaction.fromAccount?.currency ?? transaction.toAccount?.currency ?? currency;

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTransaction(transaction.id);
        setConfirmOpen(false);
        toast.success("Transaction deleted");
        router.push("/transactions");
        router.refresh();
      } catch {
        toast.error("Failed to delete transaction");
      }
    });
  }

  return (
    <>
      <div className="space-y-6 pb-24 lg:pb-0">
        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-surface-elevated/50 p-6 text-center ring-1 ring-inset",
            styles.ring,
          )}
        >
          <div
            className={cn(
              "mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              styles.badge,
            )}
          >
            <TypeIcon className="h-3.5 w-3.5" />
            {transactionTypeLabel(transaction.type)}
          </div>

          <p
            className={cn(
              "text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
              styles.amount,
            )}
          >
            {styles.prefix}
            {formatMoney(transaction.amount, accountCurrency)}
          </p>

          {transaction.comment ? (
            <p className="mt-3 text-base text-muted-foreground">{transaction.comment}</p>
          ) : null}

          <p className="mt-2 text-sm text-muted-foreground">
            {format(new Date(transaction.date), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <dl className="rounded-xl border border-border/60 bg-surface px-4 py-1">
          {transaction.type !== TransactionType.TRANSFER && (
            <DetailRow label="Category">
              {transaction.category ? (
                <span className="inline-flex items-center gap-1.5">
                  <EntityIcon
                    icon={transaction.category.icon}
                    color={transaction.category.color}
                    size="sm"
                  />
                  {transaction.category.name}
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
          )}

          <DetailRow label="Account">
            {transaction.type === TransactionType.TRANSFER ? (
              <span className="inline-flex items-center gap-1.5">
                {transaction.fromAccount?.name ?? "—"}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                {transaction.toAccount?.name ?? "—"}
              </span>
            ) : (
              transaction.fromAccount?.name ?? transaction.toAccount?.name ?? "—"
            )}
          </DetailRow>

          {!transaction.comment && (
            <DetailRow label="Comment">—</DetailRow>
          )}

          {transaction.tags.length > 0 && (
            <DetailRow label="Tags">
              <div className="flex flex-wrap justify-end gap-1">
                {transaction.tags.map(({ tag }) => (
                  <span
                    key={tag.name}
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={{ background: `${tag.color}22`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </DetailRow>
          )}
        </dl>

        {transaction.photoUrl && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Receipt
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={transaction.photoUrl}
              alt="Receipt"
              className="max-h-72 w-full rounded-xl border border-border bg-surface object-contain"
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Created {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
          {transaction.updatedAt !== transaction.createdAt && (
            <>
              {" "}
              · Updated {format(new Date(transaction.updatedAt), "MMM d, yyyy 'at' h:mm a")}
            </>
          )}
        </p>

        <div className="hidden gap-2 lg:flex">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/transactions/${transaction.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-red-400 hover:text-red-400"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/transactions/${transaction.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-red-400 hover:text-red-400"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Transaction"
        description="This transaction will be permanently deleted."
        loading={pending}
        onConfirm={handleDelete}
      />
    </>
  );
}
