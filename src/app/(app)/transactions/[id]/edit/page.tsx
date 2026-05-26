import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getTransaction } from "@/actions/transactions";
import { EditTransactionForm } from "@/components/transactions/edit-transaction-form";
import { TransactionPageHeader } from "@/components/transactions/transaction-page-header";
import { TransactionPageShell } from "@/components/transactions/transaction-page-shell";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let transaction;
  try {
    transaction = await getTransaction(id);
  } catch {
    notFound();
  }

  const initialValues = {
    type: transaction.type,
    amount: String(transaction.amount),
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
        backHref={`/transactions/${id}`}
        backLabel="Details"
      />
      <EditTransactionForm transactionId={id} initialValues={initialValues} />
    </TransactionPageShell>
  );
}
