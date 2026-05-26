"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { EntityIcon } from "@/components/ui/entity-icon";

type CategoryBarChartProps = {
  data: { name: string; color: string; amount: number }[];
};

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No category spending data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          width={75}
        />
        <Tooltip
          contentStyle={{
            background: "#141416",
            border: "1px solid #27272a",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
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
              <span className="flex items-center gap-2">
                <EntityIcon icon={cat.icon} color={cat.color} size="sm" />
                {cat.name}
              </span>
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
