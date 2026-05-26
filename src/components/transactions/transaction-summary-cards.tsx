import { Card, CardContent } from "@/components/ui/card";
import { formatAmount, wholeNumberFormat } from "@/lib/currency-format";

type TransactionSummaryCardsProps = {
  income: number;
  expenses: number;
  transfers: number;
  net: number;
};

export function TransactionSummaryCards({
  income,
  expenses,
  transfers,
  net,
}: TransactionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className="min-w-0 border-border/60 bg-surface">
        <CardContent className="p-5">
          <p className="text-xs uppercase text-muted-foreground">Income</p>
          <p className="truncate text-xl font-semibold tabular-nums text-accent-secondary">
            {formatAmount(income, wholeNumberFormat)}
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 border-border/60 bg-surface">
        <CardContent className="p-5">
          <p className="text-xs uppercase text-muted-foreground">Expenses</p>
          <p className="truncate text-xl font-semibold tabular-nums">
            {formatAmount(expenses, wholeNumberFormat)}
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 border-border/60 bg-surface">
        <CardContent className="p-5">
          <p className="text-xs uppercase text-muted-foreground">Transfers</p>
          <p className="truncate text-xl font-semibold tabular-nums">
            {formatAmount(transfers, wholeNumberFormat)}
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 border-border/60 bg-surface">
        <CardContent className="p-5">
          <p className="text-xs uppercase text-muted-foreground">Net</p>
          <p
            className={`truncate text-xl font-semibold tabular-nums ${
              net >= 0 ? "text-accent-secondary" : "text-red-400"
            }`}
          >
            {formatAmount(net, wholeNumberFormat)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
