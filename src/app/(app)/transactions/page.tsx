import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { getSettings } from "@/actions/recurring";
import { getTransactions } from "@/actions/transactions";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { parsePeriodParams } from "@/lib/periods";
import { parseTransactionTypeParam } from "@/lib/transaction-filters";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    type?: string;
    account?: string;
    category?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const { period, from, to } = parsePeriodParams(params, settings);
  const type = parseTransactionTypeParam(params.type);

  const [accounts, categories, { transactions, total, baseCurrency, summary }] = await Promise.all([
    getAccounts(),
    getCategories(),
    getTransactions({
      search: params.search,
      accountId: params.account,
      categoryId: params.category,
      type,
      from,
      to,
      sortBy: params.sort === "amount" ? "amount" : "date",
      sortOrder: "desc",
    }),
  ]);

  const visibleAccounts = accounts.filter((a) => !a.isHidden);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className={pageTitleClass}>Transactions</h1>
        <p className={pageSubtitleClass}>
          {total} transaction{total !== 1 ? "s" : ""}
        </p>
      </div>

      <TransactionFilters
        accounts={visibleAccounts}
        categories={categories}
        period={period}
      />

      <TransactionSummaryCards
        income={summary.income}
        expenses={summary.expenses}
        transfers={summary.transfers}
        net={summary.net}
      />

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <TransactionList
            key={`${period}-${params.from ?? ""}-${params.to ?? ""}-${params.account ?? "all"}-${params.type ?? "all"}-${params.category ?? "all"}-${params.search ?? ""}-${params.sort ?? "date"}`}
            transactions={transactions}
            currency={baseCurrency}
            showYear={period === "year" || period === "prev_year" || period === "all"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
