import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getTransaction } from "@/actions/transactions";
import { EditTransactionForm } from "@/components/transactions/edit-transaction-form";
import { TransactionPageHeader } from "@/components/transactions/transaction-page-header";
import { TransactionPageShell } from "@/components/transactions/transaction-page-shell";
import {
  getTransactionHref,
  getTransactionsReturnHref,
} from "@/lib/transaction-navigation";

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  const returnTo = getTransactionsReturnHref((await searchParams).returnTo);
  const detailHref = getTransactionHref(id, returnTo);

  let transaction;
  try {
    transaction = await getTransaction(id);
  } catch {
    notFound();
  }

  const initialValues = {
    type: transaction.type,
    amount: String(transaction.amount),
    toAmount: transaction.toAmount != null ? String(transaction.toAmount) : "",
    date: format(new Date(transaction.date), "yyyy-MM-dd"),
    categoryId: transaction.categoryId ?? "",
    fromAccountId: transaction.fromAccountId ?? "",
    toAccountId: transaction.toAccountId ?? "",
    comment: transaction.comment ?? "",
    photoUrl: transaction.photoUrl ?? "",
  };

  return (
    <TransactionPageShell>
      <TransactionPageHeader
        title="Edit Transaction"
        subtitle="Update transaction details"
        backHref={detailHref}
        backLabel="Details"
      />
      <EditTransactionForm
        transactionId={id}
        initialValues={initialValues}
        detailHref={detailHref}
      />
    </TransactionPageShell>
  );
}
