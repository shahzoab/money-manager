import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { getSettings } from "@/actions/recurring";
import { getTransactions } from "@/actions/transactions";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionListWithOffline } from "@/components/transactions/transaction-list-with-offline";
import { TransactionPagination } from "@/components/transactions/transaction-pagination";
import { OfflineQueuePanel } from "@/components/offline/offline-queue-panel";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { parsePeriodParams } from "@/lib/periods";
import { parseTransactionTypeParam } from "@/lib/transaction-filters";

const TRANSACTIONS_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const DEFAULT_TRANSACTIONS_PAGE_SIZE = 50;

function parsePageSize(value: string | undefined): number {
  const pageSize = Number.parseInt(value ?? "", 10);
  return TRANSACTIONS_PAGE_SIZE_OPTIONS.includes(
    pageSize as (typeof TRANSACTIONS_PAGE_SIZE_OPTIONS)[number],
  )
    ? pageSize
    : DEFAULT_TRANSACTIONS_PAGE_SIZE;
}

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
    page?: string;
    perPage?: string;
  }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const { period, from, to } = parsePeriodParams(params, settings);
  const type = parseTransactionTypeParam(params.type);
  const pageSize = parsePageSize(params.perPage);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

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
      limit: pageSize,
      offset: (page - 1) * pageSize,
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

      <OfflineQueuePanel />

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <TransactionListWithOffline
            key={`${period}-${params.from ?? ""}-${params.to ?? ""}-${params.account ?? "all"}-${params.type ?? "all"}-${params.category ?? "all"}-${params.search ?? ""}-${params.sort ?? "date"}-${page}-${pageSize}`}
            transactions={transactions}
            currency={baseCurrency}
            showYear={period === "year" || period === "prev_year" || period === "all"}
          />
          <TransactionPagination
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[...TRANSACTIONS_PAGE_SIZE_OPTIONS]}
            total={total}
            params={{
              search: params.search,
              sort: params.sort,
              type: params.type,
              account: params.account,
              category: params.category,
              period: params.period,
              from: params.from,
              to: params.to,
              perPage: params.perPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
