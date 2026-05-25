"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { TransactionType } from "@/generated/prisma/enums";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTransaction, getTransaction } from "@/actions/transactions";
import { formatMoney } from "@/lib/currency-format";
import { toast } from "sonner";

type TransactionDetail = Awaited<ReturnType<typeof getTransaction>>;

type TransactionDetailDialogProps = {
  transactionId: string | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (transactionId: string) => void;
};

function typeLabel(type: TransactionType) {
  switch (type) {
    case TransactionType.INCOME:
      return "Income";
    case TransactionType.EXPENSE:
      return "Expense";
    case TransactionType.TRANSFER:
      return "Transfer";
  }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{children}</dd>
    </div>
  );
}

export function TransactionDetailDialog({
  transactionId,
  currency,
  open,
  onOpenChange,
  onEdit,
}: TransactionDetailDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !transactionId) {
      setTransaction(null);
      return;
    }

    setLoading(true);
    getTransaction(transactionId)
      .then(setTransaction)
      .catch(() => {
        toast.error("Failed to load transaction");
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, transactionId, onOpenChange]);

  const accountCurrency =
    transaction?.fromAccount?.currency ?? transaction?.toAccount?.currency ?? currency;

  function handleDelete() {
    if (!transactionId) return;
    startTransition(async () => {
      try {
        await deleteTransaction(transactionId);
        setConfirmOpen(false);
        router.refresh();
        toast.success("Transaction deleted");
        onOpenChange(false);
      } catch {
        toast.error("Failed to delete transaction");
      }
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        {loading || !transaction ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
                {typeLabel(transaction.type)}
              </span>
              <p
                className={`text-xl font-semibold tabular-nums ${
                  transaction.type === TransactionType.INCOME
                    ? "text-accent-secondary"
                    : transaction.type === TransactionType.EXPENSE
                      ? "text-foreground"
                      : "text-accent"
                }`}
              >
                {transaction.type === TransactionType.INCOME
                  ? "+"
                  : transaction.type === TransactionType.EXPENSE
                    ? "-"
                    : ""}
                {formatMoney(transaction.amount, accountCurrency)}
              </p>
            </div>

            <dl className="space-y-4 rounded-xl border border-border bg-surface/50 p-4">
              <DetailRow label="Date">
                {format(new Date(transaction.date), "MMMM d, yyyy")}
              </DetailRow>

              {transaction.type !== TransactionType.TRANSFER && (
                <DetailRow label="Category">
                  {transaction.category ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: transaction.category.color }}
                      />
                      {transaction.category.name}
                    </span>
                  ) : (
                    "—"
                  )}
                </DetailRow>
              )}

              <DetailRow label="Account">
                {transaction.type === TransactionType.TRANSFER
                  ? `${transaction.fromAccount?.name ?? "—"} → ${transaction.toAccount?.name ?? "—"}`
                  : (transaction.fromAccount?.name ?? transaction.toAccount?.name ?? "—")}
              </DetailRow>

              <DetailRow label="Comment">{transaction.comment || "—"}</DetailRow>

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
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Receipt</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={transaction.photoUrl}
                  alt="Receipt"
                  className="max-h-64 w-full rounded-lg border border-border object-contain"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Created {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
              {transaction.updatedAt !== transaction.createdAt && (
                <>
                  {" "}
                  · Updated {format(new Date(transaction.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                </>
              )}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(transaction.id);
                }}
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
        )}
      </DialogContent>
    </Dialog>

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
