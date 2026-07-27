import "server-only";

import { db } from "@/lib/db";
import {
  defaultCategoryRows,
  defaultWalletAccountRow,
} from "@/lib/default-data";

/**
 * Runs once per newly-created auth session, not once per page render.
 * Each check makes the helper safe to retry after a partial registration.
 */
export async function provisionUserData(userId: string): Promise<void> {
  const [settings, categoryCount, accountCount] = await db.$transaction([
    db.userSettings.findUnique({
      where: { userId },
      select: { id: true },
    }),
    db.category.count({ where: { userId } }),
    db.walletAccount.count({ where: { userId } }),
  ]);

  const writes = [];
  if (!settings) {
    writes.push(db.userSettings.create({ data: { userId } }));
  }
  if (categoryCount === 0) {
    writes.push(
      db.category.createMany({
        data: defaultCategoryRows(userId),
      }),
    );
  }
  if (accountCount === 0) {
    writes.push(
      db.walletAccount.create({
        data: defaultWalletAccountRow(userId),
      }),
    );
  }

  if (writes.length > 0) {
    await db.$transaction(writes);
  }
}
