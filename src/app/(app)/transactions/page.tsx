import { getAccounts } from "@/actions/accounts";
import { getSettings } from "@/actions/recurring";
import { getTransactions } from "@/actions/transactions";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/currency-format";
import { getPeriodRange, type Period } from "@/lib/periods";
import { parseTransactionTypeParam } from "@/lib/transaction-filters";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    type?: string;
    account?: string;
    period?: string;
  }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const period = (params.period ?? settings?.homePeriod ?? "month") as Period;
  const weekStartsOn = (settings?.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const { from, to } = getPeriodRange(period, undefined, undefined, weekStartsOn);
  const type = parseTransactionTypeParam(params.type);

  const [accounts, { transactions, total, baseCurrency, summary }] = await Promise.all([
    getAccounts(),
    getTransactions({
      search: params.search,
      accountId: params.account,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {total} transaction{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AccountFilter accounts={visibleAccounts} selected={params.account} />
          <PeriodSelector period={period} />
        </div>
      </div>

      <TransactionFilters />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="min-w-0 border-border/60 bg-surface">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Income</p>
            <p className="truncate text-xl font-semibold tabular-nums text-accent-secondary">
              {formatAmount(summary.income)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border/60 bg-surface">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Expenses</p>
            <p className="truncate text-xl font-semibold tabular-nums">
              {formatAmount(summary.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border/60 bg-surface">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Transfers</p>
            <p className="truncate text-xl font-semibold tabular-nums">
              {formatAmount(summary.transfers)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border/60 bg-surface">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Net</p>
            <p
              className={`truncate text-xl font-semibold tabular-nums ${
                summary.net >= 0 ? "text-accent-secondary" : "text-red-400"
              }`}
            >
              {formatAmount(summary.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle className="text-base">All Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <TransactionList
            key={`${period}-${params.account ?? "all"}-${params.type ?? "all"}-${params.search ?? ""}-${params.sort ?? "date"}`}
            transactions={transactions}
            currency={baseCurrency}
            showYear={period === "year"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
