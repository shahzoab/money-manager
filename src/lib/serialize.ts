type DecimalLike = { toString(): string };

function toNumber(value: DecimalLike | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

export function serializeAccount<T extends { startingBalance: unknown }>(account: T) {
  return {
    ...account,
    startingBalance: Number(account.startingBalance),
  };
}

export function serializeCategory<T extends { monthlyLimit: unknown }>(category: T) {
  return {
    ...category,
    monthlyLimit: toNumber(category.monthlyLimit as DecimalLike | null),
  };
}

export function serializeTransaction<
  T extends {
    amount: unknown;
    amountInBaseCurrency: unknown;
    exchangeRate: unknown;
    category?: { monthlyLimit: unknown } | null;
    fromAccount?: { startingBalance: unknown } | null;
    toAccount?: { startingBalance: unknown } | null;
  },
>(transaction: T) {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    amountInBaseCurrency: Number(transaction.amountInBaseCurrency),
    exchangeRate: toNumber(transaction.exchangeRate as DecimalLike | null),
    category: transaction.category ? serializeCategory(transaction.category) : null,
    fromAccount: transaction.fromAccount ? serializeAccount(transaction.fromAccount) : null,
    toAccount: transaction.toAccount ? serializeAccount(transaction.toAccount) : null,
  };
}

export function serializeRecurringPayment<T extends { amount: unknown }>(payment: T) {
  return {
    ...payment,
    amount: Number(payment.amount),
  };
}
