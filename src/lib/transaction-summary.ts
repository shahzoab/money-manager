import { TransactionType } from "@/generated/prisma/client";

export function buildTransactionSummary(
  aggregates: {
    type: TransactionType;
    _sum?: { amountInBaseCurrency?: unknown };
  }[],
) {
  let income = 0;
  let expenses = 0;
  let transfers = 0;

  for (const row of aggregates) {
    const amount = Number(row._sum?.amountInBaseCurrency ?? 0);
    if (row.type === TransactionType.INCOME) income = amount;
    else if (row.type === TransactionType.EXPENSE) expenses = amount;
    else if (row.type === TransactionType.TRANSFER) transfers = amount;
  }

  return {
    income,
    expenses,
    transfers,
    net: income - expenses,
  };
}
