import { cache } from "react";
import { convertAmount } from "@/lib/currency";
import { loadUserAccountSnapshot } from "@/lib/data-loaders";
import { computeAccountBalancesFromTransactions } from "@/lib/balance-calculation";

export {
  computeAccountBalanceFromTransactions,
  computeAccountBalancesFromTransactions,
} from "@/lib/balance-calculation";

export const getUserAccountBalances = cache(async (userId: string) => {
  const snapshot = await loadUserAccountSnapshot(userId);
  const transactionsById = new Map(
    snapshot.flatMap((account) => [
      ...account.transactionsFrom,
      ...account.transactionsTo,
    ]).map((transaction) => [transaction.id, transaction]),
  );
  const transactions = [...transactionsById.values()].map((transaction) => ({
    type: transaction.type,
    amount: Number(transaction.amount),
    toAmount:
      transaction.toAmount != null ? Number(transaction.toAmount) : null,
    fromAccountId: transaction.fromAccountId,
    toAccountId: transaction.toAccountId,
  }));
  const balances = computeAccountBalancesFromTransactions(
    snapshot.map((account) => ({
      id: account.id,
      startingBalance: Number(account.startingBalance),
    })),
    transactions,
  );

  return snapshot.map(({ transactionsFrom, transactionsTo, ...account }) => {
    void transactionsFrom;
    void transactionsTo;
    return {
      ...account,
      startingBalance: Number(account.startingBalance),
      balance: balances.get(account.id) ?? Number(account.startingBalance),
    };
  });
});

export async function getAccountBalance(
  userId: string,
  accountId: string,
): Promise<number> {
  const accounts = await getUserAccountBalances(userId);
  const account = accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error("Account not found");
  }
  return account.balance;
}

export async function getTotalBalanceInCurrency(
  userId: string,
  baseCurrency: string,
  includeHidden = false,
): Promise<number> {
  const accounts = await getUserAccountBalances(userId);

  let total = 0;
  for (const account of accounts) {
    if (!includeHidden && account.isHidden) continue;
    if (account.currency === baseCurrency) {
      total += account.balance;
    } else {
      const { converted } = await convertAmount(
        account.balance,
        account.currency,
        baseCurrency,
      );
      total += converted;
    }
  }

  return total;
}

export async function recalculateAllBalances(userId: string) {
  const accounts = await getUserAccountBalances(userId);
  return accounts.map((account) => ({
    accountId: account.id,
    balance: account.balance,
  }));
}
