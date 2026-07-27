import { TransactionType } from "@/generated/prisma/client";

export function summarizeTransactions(
  transactions: Array<{
    type: TransactionType;
    amountInBaseCurrency: number;
  }>,
) {
  let income = 0;
  let expenses = 0;
  let transfers = 0;

  for (const transaction of transactions) {
    if (transaction.type === TransactionType.INCOME) {
      income += transaction.amountInBaseCurrency;
    } else if (transaction.type === TransactionType.EXPENSE) {
      expenses += transaction.amountInBaseCurrency;
    } else {
      transfers += transaction.amountInBaseCurrency;
    }
  }

  return {
    income,
    expenses,
    transfers,
    net: income - expenses,
  };
}
