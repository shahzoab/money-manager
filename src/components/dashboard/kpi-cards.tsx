import { Card, CardContent } from "@/components/ui/card";
import { formatAmount } from "@/lib/currency-format";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: number;
  valueClassName?: string;
};

export function KpiCard({ label, value, valueClassName }: KpiCardProps) {
  const formatted = formatAmount(value);

  return (
    <Card className="min-w-0 border-border/60 bg-surface">
      <CardContent className="p-5">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p
          className={cn("truncate text-xl font-semibold tabular-nums", valueClassName)}
          title={formatted}
        >
          {formatted}
        </p>
      </CardContent>
    </Card>
  );
}

type KpiGridProps = {
  totalBalance: number;
  income: number;
  expenses: number;
  netFlow: number;
};

export function KpiGrid({ totalBalance, income, expenses, netFlow }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Total Balance"
        value={totalBalance}
        valueClassName="text-accent"
      />
      <KpiCard
        label="Income"
        value={income}
        valueClassName="text-accent-secondary"
      />
      <KpiCard label="Expenses" value={expenses} />
      <KpiCard
        label="Net Flow"
        value={netFlow}
        valueClassName={netFlow >= 0 ? "text-accent-secondary" : "text-red-400"}
      />
    </div>
  );
}
