"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendChartProps = {
  data: { date: string; income: number; expense: number; net: number }[];
  currency: string;
};

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No transaction data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#635BFF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#635BFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "#141416",
            border: "1px solid #27272a",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#00D4AA"
          fill="url(#incomeGrad)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="#635BFF"
          fill="url(#expenseGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
