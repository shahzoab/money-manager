import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { TransactionPageHeader } from "@/components/transactions/transaction-page-header";
import { TransactionPageShell } from "@/components/transactions/transaction-page-shell";
import { getTransactionsReturnHref } from "@/lib/transaction-navigation";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const returnTo = getTransactionsReturnHref((await searchParams).returnTo);
  return (
    <TransactionPageShell>
      <TransactionPageHeader
        title="Add Transaction"
        subtitle="Record income, expense, or transfer"
        backLabel="Transactions"
        backHref={returnTo}
      />
      <AddTransactionForm />
    </TransactionPageShell>
  );
}
