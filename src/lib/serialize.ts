type DecimalLike = { toString(): string };
type DateLike = Date | string;

function toNumber(value: DecimalLike | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function toIsoString(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : value;
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
    toAmount?: unknown;
    amountInBaseCurrency: unknown;
    exchangeRate: unknown;
    date: DateLike;
    createdAt: DateLike;
    updatedAt: DateLike;
    category?: { monthlyLimit: unknown } | null;
    fromAccount?: { startingBalance: unknown } | null;
    toAccount?: { startingBalance: unknown } | null;
  },
>(transaction: T) {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    toAmount: toNumber(transaction.toAmount as DecimalLike | null | undefined),
    amountInBaseCurrency: Number(transaction.amountInBaseCurrency),
    exchangeRate: toNumber(transaction.exchangeRate as DecimalLike | null),
    date: toIsoString(transaction.date),
    createdAt: toIsoString(transaction.createdAt),
    updatedAt: toIsoString(transaction.updatedAt),
    category: transaction.category ? serializeCategory(transaction.category) : null,
    fromAccount: transaction.fromAccount ? serializeAccount(transaction.fromAccount) : null,
    toAccount: transaction.toAccount ? serializeAccount(transaction.toAccount) : null,
  };
}

export function serializeRecurringPayment<
  T extends {
    amount: unknown;
    nextDueDate: DateLike;
    reminderAt: DateLike | null;
    createdAt: DateLike;
    updatedAt: DateLike;
  },
>(payment: T) {
  return {
    ...payment,
    amount: Number(payment.amount),
    nextDueDate: toIsoString(payment.nextDueDate),
    reminderAt: payment.reminderAt ? toIsoString(payment.reminderAt) : null,
    createdAt: toIsoString(payment.createdAt),
    updatedAt: toIsoString(payment.updatedAt),
  };
}
