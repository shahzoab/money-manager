import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { getChartData, getDashboardData } from "@/actions/dashboard";
import { getSettings } from "@/actions/recurring";
import { CategoryBarChart } from "@/components/charts/category-charts";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { parsePeriodParams } from "@/lib/periods";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; account?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const { period, from, to } = parsePeriodParams(params, settings);
  const dataOptions = {
    period,
    accountId: params.account,
    customFrom: from,
    customTo: to,
  };
  const [data, chartData] = await Promise.all([
    getDashboardData(dataOptions),
    getChartData(dataOptions),
  ]);

  const transactionsQuery = new URLSearchParams();
  transactionsQuery.set("period", data.period);
  if (params.account) transactionsQuery.set("account", params.account);
  if (params.from) transactionsQuery.set("from", params.from);
  if (params.to) transactionsQuery.set("to", params.to);
  const transactionsHref = `/transactions?${transactionsQuery.toString()}`;
  const chartsHref = `/charts?${transactionsQuery.toString()}`;
  const categoryBarData = chartData.categoryChart.slice(0, 5).map((c) => ({
    name: c.name,
    color: c.color,
    icon: c.icon,
    amount: c.amount,
  }));

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={pageTitleClass}>Dashboard</h1>
          <p className={pageSubtitleClass}>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/60 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Top Spending Categories</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <Link href={chartsHref}>
                Reports
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={categoryBarData}
              currency={chartData.baseCurrency}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Cash Flow Trend</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <Link href={chartsHref}>
                Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartData.trendData}
              currency={chartData.baseCurrency}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Transactions</CardTitle>
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
