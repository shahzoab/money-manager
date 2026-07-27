import { TransactionType } from "@/generated/prisma/client";

export type BalanceTransactionRow = {
  type: TransactionType;
  amount: number;
  toAmount?: number | null;
  fromAccountId: string | null;
  toAccountId: string | null;
};

export function computeAccountBalanceFromTransactions(
  startingBalance: number,
  accountId: string,
  transactions: BalanceTransactionRow[],
): number {
  return (
    computeAccountBalancesFromTransactions(
      [{ id: accountId, startingBalance }],
      transactions,
    ).get(accountId) ?? startingBalance
  );
}

export function computeAccountBalancesFromTransactions(
  accounts: Array<{ id: string; startingBalance: number }>,
  transactions: BalanceTransactionRow[],
): Map<string, number> {
  const balances = new Map(
    accounts.map((account) => [account.id, account.startingBalance]),
  );

  for (const transaction of transactions) {
    if (transaction.type === TransactionType.INCOME && transaction.toAccountId) {
      balances.set(
        transaction.toAccountId,
        (balances.get(transaction.toAccountId) ?? 0) + transaction.amount,
      );
    } else if (
      transaction.type === TransactionType.EXPENSE &&
      transaction.fromAccountId
    ) {
      balances.set(
        transaction.fromAccountId,
        (balances.get(transaction.fromAccountId) ?? 0) - transaction.amount,
      );
    } else if (transaction.type === TransactionType.TRANSFER) {
      if (transaction.fromAccountId) {
        balances.set(
          transaction.fromAccountId,
          (balances.get(transaction.fromAccountId) ?? 0) - transaction.amount,
        );
      }
      if (transaction.toAccountId) {
        balances.set(
          transaction.toAccountId,
          (balances.get(transaction.toAccountId) ?? 0) +
            (transaction.toAmount ?? transaction.amount),
        );
      }
    }
  }

  return balances;
}
