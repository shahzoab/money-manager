import { notFound } from "next/navigation";
import { getSettings } from "@/actions/recurring";
import { getTransaction } from "@/actions/transactions";
import { TransactionDetailView } from "@/components/transactions/transaction-detail-view";
import { TransactionPageHeader } from "@/components/transactions/transaction-page-header";
import { TransactionPageShell } from "@/components/transactions/transaction-page-shell";
import { getTransactionsReturnHref } from "@/lib/transaction-navigation";

export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  const returnTo = getTransactionsReturnHref((await searchParams).returnTo);

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
        backHref={returnTo}
      />
      <TransactionDetailView
        transaction={transaction}
        currency={currency}
        returnTo={returnTo}
      />
    </TransactionPageShell>
  );
}
