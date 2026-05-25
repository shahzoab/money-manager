"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth-server";
import { activeWalletAccountWhere } from "@/lib/accounts";
import { db } from "@/lib/db";
import { serializeAccount } from "@/lib/serialize";

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

export async function getAccounts() {
  const session = await requireSession();
  const accounts = await db.walletAccount.findMany({
    where: { userId: session.user.id, ...activeWalletAccountWhere },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return accounts.map(serializeAccount);
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

  const account = await db.walletAccount.create({
    data: { ...data, userId: session.user.id },
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
        orderBy: { name: "asc" },
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
