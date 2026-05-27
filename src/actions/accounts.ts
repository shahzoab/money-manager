"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TransactionType } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { activeWalletAccountWhere } from "@/lib/accounts";
import { getAccountBalance } from "@/lib/balance";
import { db } from "@/lib/db";
import { serializeAccount } from "@/lib/serialize";
import { createTransaction } from "@/actions/transactions";

const BALANCE_EPSILON = 0.0001;

const reconcileSchema = z.object({
  accountId: z.string().min(1),
  targetBalance: z.number(),
  date: z.coerce.date().optional(),
  comment: z.string().optional(),
});

const accountSchema = z.object({
  name: z.string().min(1),
  currency: z.string().length(3),
  startingBalance: z.number().default(0),
  color: z.string().default("#635BFF"),
  icon: z.string().default("wallet"),
  isHidden: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  notes: z.string().optional(),
});

const accountOrderBy = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

export async function getAccounts() {
  const session = await requireSession();
  const accounts = await db.walletAccount.findMany({
    where: { userId: session.user.id, ...activeWalletAccountWhere },
    orderBy: accountOrderBy,
  });
  return accounts.map(serializeAccount);
}

async function nextAccountSortOrder(userId: string): Promise<number> {
  const max = await db.walletAccount.aggregate({
    where: { userId, ...activeWalletAccountWhere },
    _max: { sortOrder: true },
  });
  return (max._max.sortOrder ?? -1) + 1;
}

export async function createAccount(input: z.infer<typeof accountSchema>) {
  const session = await requireSession();
  const data = accountSchema.parse(input);

  if (data.isDefault) {
    await db.walletAccount.updateMany({
      where: { userId: session.user.id, ...activeWalletAccountWhere },
      data: { isDefault: false },
    });
  }

  const sortOrder = await nextAccountSortOrder(session.user.id);

  const account = await db.walletAccount.create({
    data: { ...data, userId: session.user.id, sortOrder },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function updateAccount(
  id: string,
  input: Partial<z.infer<typeof accountSchema>>,
) {
  const session = await requireSession();
  const data = accountSchema.partial().parse(input);

  const existing = await db.walletAccount.findFirst({
    where: { id, userId: session.user.id, ...activeWalletAccountWhere },
  });
  if (!existing) {
    throw new Error("Account not found");
  }

  if (data.isDefault) {
    await db.walletAccount.updateMany({
      where: { userId: session.user.id, ...activeWalletAccountWhere },
      data: { isDefault: false },
    });
  }

  const account = await db.walletAccount.update({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function reorderAccounts(orderedIds: string[]) {
  const session = await requireSession();
  const userId = session.user.id;

  const existing = await db.walletAccount.findMany({
    where: { userId, ...activeWalletAccountWhere },
    select: { id: true },
    orderBy: accountOrderBy,
  });

  const existingIds = existing.map((a) => a.id);
  if (
    orderedIds.length !== existingIds.length ||
    !orderedIds.every((id) => existingIds.includes(id))
  ) {
    throw new Error("Invalid account order");
  }

  await db.$transaction(
    orderedIds.map((id, sortOrder) =>
      db.walletAccount.update({
        where: { id, userId },
        data: { sortOrder },
      }),
    ),
  );

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function deleteAccount(id: string) {
  const session = await requireSession();
  const userId = session.user.id;

  const account = await db.walletAccount.findFirst({
    where: { id, userId, ...activeWalletAccountWhere },
  });
  if (!account) {
    throw new Error("Account not found");
  }

  await db.$transaction(async (tx) => {
    await tx.walletAccount.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });

    await tx.recurringPayment.updateMany({
      where: { accountId: id, userId },
      data: { isActive: false },
    });

    if (account.isDefault) {
      const nextDefault = await tx.walletAccount.findFirst({
        where: { userId, ...activeWalletAccountWhere, id: { not: id } },
        orderBy: accountOrderBy,
      });
      if (nextDefault) {
        await tx.walletAccount.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/recurring");
}

export async function recalculateBalances() {
  const session = await requireSession();
  const { recalculateAllBalances } = await import("@/lib/balance");
  return recalculateAllBalances(session.user.id);
}

export async function reconcileAccountBalance(
  input: z.infer<typeof reconcileSchema>,
) {
  const session = await requireSession();
  const { accountId, targetBalance, date, comment } = reconcileSchema.parse(input);

  const account = await db.walletAccount.findFirst({
    where: { id: accountId, userId: session.user.id, ...activeWalletAccountWhere },
  });
  if (!account) {
    throw new Error("Account not found");
  }

  const currentBalance = await getAccountBalance(accountId);
  const delta = targetBalance - currentBalance;

  if (Math.abs(delta) < BALANCE_EPSILON) {
    return { created: false as const, currentBalance, targetBalance };
  }

  const amount = Math.abs(delta);
  const note = comment?.trim();
  const defaultComment = "Balance reconciliation";
  const txComment = note ? `${defaultComment}: ${note}` : defaultComment;

  const transaction = await createTransaction({
    type: delta > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
    amount,
    date: date ?? new Date(),
    comment: txComment,
    toAccountId: delta > 0 ? accountId : undefined,
    fromAccountId: delta < 0 ? accountId : undefined,
    isReconciliation: true,
  });

  revalidatePath("/accounts");

  return {
    created: true as const,
    transactionId: transaction.id,
    delta,
    type: delta > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
    currentBalance,
    targetBalance,
  };
}
