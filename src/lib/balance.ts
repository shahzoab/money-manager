import { TransactionType } from "@/generated/prisma/client";
import { activeWalletAccountWhere } from "@/lib/accounts";
import { db } from "@/lib/db";
import { convertAmount } from "@/lib/currency";

type TxRow = {
  type: TransactionType;
  amount: number;
  fromAccountId: string | null;
  toAccountId: string | null;
};

export function computeAccountBalanceFromTransactions(
  startingBalance: number,
  accountId: string,
  transactions: TxRow[],
): number {
  let balance = startingBalance;

  for (const tx of transactions) {
    if (tx.type === TransactionType.INCOME && tx.toAccountId === accountId) {
      balance += tx.amount;
    } else if (
      tx.type === TransactionType.EXPENSE &&
      tx.fromAccountId === accountId
    ) {
      balance -= tx.amount;
    } else if (tx.type === TransactionType.TRANSFER) {
      if (tx.fromAccountId === accountId) balance -= tx.amount;
      if (tx.toAccountId === accountId) balance += tx.amount;
    }
  }

  return balance;
}

export async function getAccountBalance(accountId: string): Promise<number> {
  const account = await db.walletAccount.findUniqueOrThrow({
    where: { id: accountId },
  });

  const transactions = await db.transaction.findMany({
    where: {
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
    },
    select: {
      type: true,
      amount: true,
      fromAccountId: true,
      toAccountId: true,
    },
  });

  return computeAccountBalanceFromTransactions(
    Number(account.startingBalance),
    accountId,
    transactions.map((t) => ({
      type: t.type,
      amount: Number(t.amount),
      fromAccountId: t.fromAccountId,
      toAccountId: t.toAccountId,
    })),
  );
}

export async function getTotalBalanceInCurrency(
  userId: string,
  baseCurrency: string,
  includeHidden = false,
): Promise<number> {
  const accounts = await db.walletAccount.findMany({
    where: {
      userId,
      ...activeWalletAccountWhere,
      ...(includeHidden ? {} : { isHidden: false }),
    },
  });

  let total = 0;
  for (const account of accounts) {
    const balance = await getAccountBalance(account.id);
    if (account.currency === baseCurrency) {
      total += balance;
    } else {
      const { converted } = await convertAmount(
        balance,
        account.currency,
        baseCurrency,
      );
      total += converted;
    }
  }

  return total;
}

export async function recalculateAllBalances(userId: string) {
  const accounts = await db.walletAccount.findMany({
    where: { userId, ...activeWalletAccountWhere },
  });
  return Promise.all(
    accounts.map(async (account) => ({
      accountId: account.id,
      balance: await getAccountBalance(account.id),
    })),
  );
}
