import { getChartData, getDashboardData } from "@/actions/dashboard";
import {
  CategoryBarChart,
  BudgetProgress
} from "@/components/charts/category-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { formatAmount } from "@/lib/currency-format";

export default async function ChartsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = (params.period ?? "month") as
    | "day"
    | "week"
    | "month"
    | "year";
  const [chartData, dashData] = await Promise.all([
    getChartData({ period }),
    getDashboardData({ period })
  ]);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Charts & Reports</h1>
        <p className="text-sm text-muted-foreground">
          Analyze your spending patterns
        </p>
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
            <CardTitle className="text-base">Cash Flow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={dashData.trendData}
              currency={chartData.baseCurrency}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={chartData.categoryChart.map(c => ({
                name: c.name,
                color: c.color,
                amount: c.amount
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Budget Limits</CardTitle>
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
