import { TransactionType } from "@/generated/prisma/client";

export function parseTransactionTypeParam(
  value?: string,
): TransactionType | undefined {
  if (!value || value === "all") return undefined;

  const map: Record<string, TransactionType> = {
    expense: TransactionType.EXPENSE,
    income: TransactionType.INCOME,
    transfer: TransactionType.TRANSFER,
  };

  return map[value.toLowerCase()];
}
