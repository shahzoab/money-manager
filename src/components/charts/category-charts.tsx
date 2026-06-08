"use client";

import { EntityBadge } from "@/components/ui/entity-badge";
import { formatAmount } from "@/lib/currency-format";

type CategoryBarItem = {
  name: string;
  color: string;
  icon?: string;
  amount: number;
};

type CategoryBarChartProps = {
  data: CategoryBarItem[];
  currency?: string;
};

function CategoryBarList({ data }: CategoryBarChartProps) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = Math.max(4, (item.amount / maxAmount) * 100);
        return (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <EntityBadge icon={item.icon ?? "tag"} color={item.color} size="sm">
                {item.name}
              </EntityBadge>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatAmount(item.amount)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryBarChart({ data, currency }: CategoryBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No category spending data
      </div>
    );
  }

  return <CategoryBarList data={data} currency={currency} />;
}

type BudgetProgressProps = {
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string;
    amount: number;
    limit: number | null;
  }[];
  currency: string;
};

export function BudgetProgress({ categories }: BudgetProgressProps) {
  const withLimits = categories.filter((c) => c.limit && c.limit > 0);
  if (withLimits.length === 0) return null;

  return (
    <div className="space-y-4">
      {withLimits.map((cat) => {
        const pct = Math.min(100, (cat.amount / (cat.limit ?? 1)) * 100);
        const over = cat.amount > (cat.limit ?? 0);
        return (
          <div key={cat.id}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <EntityBadge icon={cat.icon} color={cat.color} size="sm">
                {cat.name}
              </EntityBadge>
              <span className={over ? "text-red-400" : "text-muted-foreground"}>
                {cat.amount.toFixed(0)} / {cat.limit?.toFixed(0)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-accent"}`}
                style={{ width: `${pct}%`, background: over ? undefined : cat.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
