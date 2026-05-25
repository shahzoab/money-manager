import { db } from "@/lib/db";

export const activeWalletAccountWhere = { deletedAt: null } as const;

export async function assertActiveWalletAccounts(
  userId: string,
  accountIds: (string | undefined | null)[],
) {
  const ids = [...new Set(accountIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;

  const count = await db.walletAccount.count({
    where: { id: { in: ids }, userId, ...activeWalletAccountWhere },
  });
  if (count !== ids.length) {
    throw new Error("Account not found");
  }
}
