"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTransaction, updateTransaction } from "@/actions/transactions";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/transaction-form";
import { toast } from "sonner";

type EditTransactionDialogProps = {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditTransactionDialog({
  transactionId,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [initialValues, setInitialValues] = useState<Partial<TransactionFormValues>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !transactionId) {
      setInitialValues(undefined);
      return;
    }

    setLoading(true);
    getTransaction(transactionId)
      .then((tx) => {
        setInitialValues({
          type: tx.type,
          amount: String(tx.amount),
          date: format(new Date(tx.date), "yyyy-MM-dd"),
          categoryId: tx.categoryId ?? "",
          fromAccountId: tx.fromAccountId ?? "",
          toAccountId: tx.toAccountId ?? "",
          comment: tx.comment ?? "",
          photoUrl: tx.photoUrl ?? "",
        });
      })
      .catch(() => {
        toast.error("Failed to load transaction");
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, transactionId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        {loading || !initialValues ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <TransactionForm
            key={transactionId}
            mode="edit"
            submitLabel="Save Changes"
            pending={pending}
            initialValues={initialValues}
            onSubmit={(data) => {
              if (!transactionId) return;
              startTransition(async () => {
                try {
                  await updateTransaction(transactionId, data);
                  router.refresh();
                  toast.success("Transaction updated");
                  onOpenChange(false);
                } catch {
                  toast.error("Failed to update transaction");
                }
              });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
