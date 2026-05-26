import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDashboardData } from "@/actions/dashboard";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { AccountFilter } from "@/components/dashboard/account-filter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; account?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData({
    period: params.period as "day" | "week" | "month" | "year" | undefined,
    accountId: params.account,
  });

  const transactionsQuery = new URLSearchParams();
  if (data.period) transactionsQuery.set("period", data.period);
  if (params.account) transactionsQuery.set("account", params.account);
  const transactionsHref =
    transactionsQuery.size > 0
      ? `/transactions?${transactionsQuery.toString()}`
      : "/transactions";

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your financial overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AccountFilter accounts={data.accounts} selected={params.account} />
          <PeriodSelector period={data.period} />
        </div>
      </div>

      <TransactionSummaryCards
        income={data.income}
        expenses={data.expenses}
        transfers={data.transfers}
        net={data.net}
      />

      <Card className="border-border/60 bg-surface">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
            <Link href={transactionsHref}>
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <TransactionList
            transactions={data.transactions}
            currency={data.baseCurrency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
