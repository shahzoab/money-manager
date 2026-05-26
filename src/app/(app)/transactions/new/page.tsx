import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { TransactionPageHeader } from "@/components/transactions/transaction-page-header";
import { TransactionPageShell } from "@/components/transactions/transaction-page-shell";

export default function NewTransactionPage() {
  return (
    <TransactionPageShell>
      <TransactionPageHeader
        title="Add Transaction"
        subtitle="Record income, expense, or transfer"
        backLabel="Transactions"
      />
      <AddTransactionForm />
    </TransactionPageShell>
  );
}
