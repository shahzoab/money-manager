import { Suspense } from "react";
import { getAccounts } from "@/actions/accounts";
import { getChartData } from "@/actions/dashboard";
import { getSettings } from "@/actions/recurring";
import {
  CategoryBarChart,
  BudgetProgress
} from "@/components/charts/category-charts";
import { ChartsFilters } from "@/components/charts/charts-filters";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { formatAmount } from "@/lib/currency-format";
import { parsePeriodParams } from "@/lib/periods";

export default async function ChartsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; account?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const { period, from, to } = parsePeriodParams(params, settings);

  const [accounts, chartData] = await Promise.all([
    getAccounts(),
    getChartData({
      period,
      accountId: params.account,
      customFrom: from,
      customTo: to,
    }),
  ]);

  const filterAccounts = accounts
    .filter((a) => !a.isHidden)
    .map(({ id, name, currency, color, icon }) => ({ id, name, currency, color, icon }));
  const categoryBarData = chartData.categoryChart.map((c) => ({
    name: c.name,
    color: c.color,
    icon: c.icon,
    amount: c.amount,
  }));

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={pageTitleClass}>Charts & Reports</h1>
          <p className={pageSubtitleClass}>
            Analyze your spending patterns
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-14 w-full max-w-md animate-pulse rounded-xl bg-surface-elevated sm:w-[360px]" />
          }
        >
          <ChartsFilters
            accounts={filterAccounts}
            period={period}
            selectedAccount={params.account}
          />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 border-border/60 bg-surface">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Income</p>
            <p className="truncate text-xl font-semibold tabular-nums text-accent-secondary">
              {formatAmount(chartData.totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border/60 bg-surface">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Expenses</p>
            <p className="truncate text-xl font-semibold tabular-nums">
              {formatAmount(chartData.totalExpense)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border/60 bg-surface sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Net</p>
            <p
              className={`truncate text-xl font-semibold tabular-nums ${chartData.net >= 0 ? "text-accent-secondary" : "text-red-400"}`}
            >
              {formatAmount(chartData.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-surface">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={categoryBarData}
              currency={chartData.baseCurrency}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface">
          <CardHeader>
            <CardTitle>Cash Flow Trend</CardTitle>
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
        <CardHeader>
          <CardTitle>Budget Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetProgress
            categories={chartData.categoryChart}
            currency={chartData.baseCurrency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
