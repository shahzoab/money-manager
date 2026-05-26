import { notFound } from "next/navigation";
import { getSettings } from "@/actions/recurring";
import { getTransaction } from "@/actions/transactions";
import { TransactionDetailView } from "@/components/transactions/transaction-detail-view";
import { TransactionPageHeader } from "@/components/transactions/transaction-page-header";
import { TransactionPageShell } from "@/components/transactions/transaction-page-shell";

export default async function TransactionDetailPage({
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

  const settings = await getSettings();
  const currency = settings?.defaultCurrency ?? "USD";

  return (
    <TransactionPageShell>
      <TransactionPageHeader
        title="Transaction Details"
        backLabel="Transactions"
      />
      <TransactionDetailView transaction={transaction} currency={currency} />
    </TransactionPageShell>
  );
}
