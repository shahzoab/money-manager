"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTransaction } from "@/actions/transactions";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/transaction-form";
import { toast } from "sonner";

type EditTransactionFormProps = {
  transactionId: string;
  initialValues: Partial<TransactionFormValues>;
};

export function EditTransactionForm({
  transactionId,
  initialValues,
}: EditTransactionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <TransactionForm
      key={transactionId}
      mode="edit"
      submitLabel="Save Changes"
      pending={pending}
      cancelHref={`/transactions/${transactionId}`}
      initialValues={initialValues}
      onSubmit={(data) => {
        startTransition(async () => {
          try {
            await updateTransaction(transactionId, data);
            toast.success("Transaction updated");
            router.push(`/transactions/${transactionId}`);
            router.refresh();
          } catch {
            toast.error("Failed to update transaction");
          }
        });
      }}
    />
  );
}
