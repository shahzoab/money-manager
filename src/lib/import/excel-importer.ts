import { CategoryType, TransactionType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { ParsedExcelImport, ParsedTransaction } from "@/lib/import/excel";

export type ImportSummary = {
  format: ParsedExcelImport["format"];
  accounts: number;
  categories: number;
  tags: number;
  expenses: number;
  income: number;
  transfers: number;
  skipped: number;
  errors: string[];
};

const BATCH_SIZE = 500;

function normalizeName(name: string): string {
  return name.trim();
}

function categoryKey(name: string, type: CategoryType): string {
  return `${type}:${normalizeName(name)}`;
}

export async function importExcelData(
  userId: string,
  data: ParsedExcelImport,
): Promise<ImportSummary> {
  const skipped = data.errors.length;
  let expenseCount = 0;
  let incomeCount = 0;
  let transferCount = 0;

  await db.$transaction(
    async (tx) => {
      await tx.transactionTag.deleteMany({ where: { transaction: { userId } } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.recurringPaymentTag.deleteMany({
        where: { recurringPayment: { userId } },
      });
      await tx.recurringPayment.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      await tx.walletAccount.deleteMany({ where: { userId } });
      await tx.tag.deleteMany({ where: { userId } });

      await tx.userSettings.upsert({
        where: { userId },
        create: { userId, defaultCurrency: data.defaultCurrency },
        update: { defaultCurrency: data.defaultCurrency },
      });

      if (data.accounts.length > 0) {
        await tx.walletAccount.createMany({
          data: data.accounts.map((a, i) => ({
            userId,
            name: normalizeName(a.name),
            currency: a.currency,
            startingBalance: a.startingBalance,
            isHidden: a.isHidden,
            isDefault: i === 0,
            sortOrder: i,
          })),
        });
      }

      if (data.categories.length > 0) {
        await tx.category.createMany({
          data: data.categories.map((c, i) => ({
            userId,
            name: normalizeName(c.name),
            type: c.type,
            sortOrder: i,
          })),
        });
      }

      if (data.tags.length > 0) {
        await tx.tag.createMany({
          data: data.tags.map((t) => ({
            userId,
            name: normalizeName(t.name),
          })),
        });
      }

      const [accounts, categories, tags] = await Promise.all([
        tx.walletAccount.findMany({ where: { userId } }),
        tx.category.findMany({ where: { userId } }),
        tx.tag.findMany({ where: { userId } }),
      ]);

      const accountIdByName = new Map(
        accounts.map((a) => [normalizeName(a.name).toLowerCase(), a.id]),
      );
      const categoryIdByKey = new Map(
        categories.map((c) => [categoryKey(c.name, c.type), c.id]),
      );
      const tagIdByName = new Map(
        tags.map((t) => [normalizeName(t.name).toLowerCase(), t.id]),
      );

      const txRows: Array<{
        id: string;
        userId: string;
        type: TransactionType;
        amount: number;
        amountInBaseCurrency: number;
        exchangeRate?: number;
        date: Date;
        comment?: string;
        categoryId?: string;
        fromAccountId?: string;
        toAccountId?: string;
      }> = [];

      const tagLinks: Array<{ transactionId: string; tagId: string }> = [];

      for (const row of data.transactions) {
        const resolved = resolveTransaction(row, accountIdByName, categoryIdByKey);
        if (!resolved) continue;

        if (row.type === TransactionType.EXPENSE) expenseCount++;
        else if (row.type === TransactionType.INCOME) incomeCount++;
        else transferCount++;

        txRows.push({ ...resolved, userId });

        for (const tagName of row.tagNames) {
          const tagId = tagIdByName.get(normalizeName(tagName).toLowerCase());
          if (tagId) {
            tagLinks.push({ transactionId: resolved.id, tagId });
          }
        }
      }

      for (let i = 0; i < txRows.length; i += BATCH_SIZE) {
        await tx.transaction.createMany({
          data: txRows.slice(i, i + BATCH_SIZE),
        });
      }

      for (let i = 0; i < tagLinks.length; i += BATCH_SIZE) {
        await tx.transactionTag.createMany({
          data: tagLinks.slice(i, i + BATCH_SIZE),
        });
      }
    },
    { timeout: 120_000 },
  );

  return {
    format: data.format,
    accounts: data.accounts.length,
    categories: data.categories.length,
    tags: data.tags.length,
    expenses: expenseCount,
    income: incomeCount,
    transfers: transferCount,
    skipped,
    errors: data.errors,
  };
}

function resolveTransaction(
  row: ParsedTransaction,
  accountIdByName: Map<string, string>,
  categoryIdByKey: Map<string, string>,
) {
  const id = crypto.randomUUID();
  const lookupAccount = (name?: string) =>
    name ? accountIdByName.get(normalizeName(name).toLowerCase()) : undefined;

  const fromAccountId = lookupAccount(row.fromAccountName);
  const toAccountId = lookupAccount(row.toAccountName);

  let categoryId: string | undefined;
  if (row.categoryName) {
    const type =
      row.type === TransactionType.INCOME
        ? CategoryType.INCOME
        : CategoryType.EXPENSE;
    categoryId = categoryIdByKey.get(categoryKey(row.categoryName, type));
  }

  if (row.type === TransactionType.EXPENSE && !fromAccountId) return null;
  if (row.type === TransactionType.INCOME && !toAccountId) return null;
  if (row.type === TransactionType.TRANSFER && (!fromAccountId || !toAccountId)) {
    return null;
  }

  return {
    id,
    type: row.type,
    amount: row.amount,
    amountInBaseCurrency: row.amountInBaseCurrency,
    exchangeRate: row.exchangeRate,
    date: row.date,
    comment: row.comment,
    categoryId,
    fromAccountId,
    toAccountId,
  };
}
