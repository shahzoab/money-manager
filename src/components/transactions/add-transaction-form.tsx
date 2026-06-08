"use client";

import { Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TransactionType } from "@/generated/prisma/enums";
import { createTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { queuePendingTransaction } from "@/lib/offline-data";
import { toast } from "sonner";

function parseTypeParam(value: string | null): TransactionType {
  const map: Record<string, TransactionType> = {
    expense: TransactionType.EXPENSE,
    income: TransactionType.INCOME,
    transfer: TransactionType.TRANSFER,
  };
  if (!value) return TransactionType.EXPENSE;
  return map[value.toLowerCase()] ?? TransactionType.EXPENSE;
}

function AddTransactionFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const defaultType = parseTypeParam(searchParams.get("type"));

  return (
    <TransactionForm
      mode="create"
      submitLabel="Save Transaction"
      pending={pending}
      autoFocusAmount
      cancelHref="/transactions"
      initialValues={{ type: defaultType }}
      onSubmit={(data) => {
        startTransition(async () => {
          if (!navigator.onLine) {
            try {
              await queuePendingTransaction(data);
              toast.success("Saved offline — will sync when connected");
              router.push("/transactions");
              router.refresh();
            } catch {
              toast.error("Failed to save transaction offline");
            }
            return;
          }

          try {
            const result = await createTransaction(data);
            toast.success("Transaction added");
            router.push(`/transactions/${result.id}`);
            router.refresh();
          } catch {
            toast.error("Failed to add transaction");
          }
        });
      }}
    />
  );
}

export function AddTransactionForm() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-11 rounded-lg bg-surface-elevated" />
          <div className="h-32 rounded-2xl bg-surface-elevated" />
          <div className="space-y-3">
            <div className="h-4 w-16 rounded bg-surface-elevated" />
            <div className="h-10 rounded-lg bg-surface-elevated" />
            <div className="h-10 rounded-lg bg-surface-elevated" />
          </div>
        </div>
      }
    >
      <AddTransactionFormInner />
    </Suspense>
  );
}
