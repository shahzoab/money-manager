import { getDashboardData } from "@/actions/dashboard";
import { KpiGrid } from "@/components/dashboard/kpi-cards";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CategoryBarChart } from "@/components/charts/category-charts";
import { TransactionList } from "@/components/transactions/transaction-list";
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

  return (
    <div className="space-y-6">
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

      <KpiGrid
        totalBalance={data.totalBalance}
        income={data.income}
        expenses={data.expenses}
        netFlow={data.netFlow}
        currency={data.baseCurrency}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={data.trendData} currency={data.baseCurrency} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={data.categoryData} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
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
