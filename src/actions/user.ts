"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-server";
import { recalculateStaleBaseCurrencyAmounts } from "@/actions/transactions";
import { db } from "@/lib/db";
import {
  seedDefaultCategories,
  seedDefaultWalletAccount,
  ensureUserSettings,
} from "../../prisma/seed";

export async function initializeUserData() {
  const session = await requireSession();
  const userId = session.user.id;

  await ensureUserSettings(userId);
  await seedDefaultCategories(userId);
  await seedDefaultWalletAccount(userId);

  const settings = await db.userSettings.findUnique({ where: { userId } });
  const baseCurrency = settings?.defaultCurrency ?? "USD";
  await recalculateStaleBaseCurrencyAmounts(userId, baseCurrency);
}

export async function updateProfile(data: { name?: string; image?: string }) {
  const session = await requireSession();
  const { db } = await import("@/lib/db");

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.image !== undefined && { image: data.image }),
    },
  });

  revalidatePath("/settings");
}
