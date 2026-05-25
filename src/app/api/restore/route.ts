import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireSession();
  const userId = session.user.id;
  const data = await request.json();

  if (!data.version) {
    return NextResponse.json({ error: "Invalid backup" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.transactionTag.deleteMany({ where: { transaction: { userId } } });
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.recurringPaymentTag.deleteMany({
      where: { recurringPayment: { userId } },
    });
    await tx.recurringPayment.deleteMany({ where: { userId } });
    await tx.category.deleteMany({ where: { userId } });
    await tx.walletAccount.deleteMany({ where: { userId } });
    await tx.tag.deleteMany({ where: { userId } });

    if (data.accounts?.length) {
      await tx.walletAccount.createMany({
        data: data.accounts.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          userId,
          name: a.name as string,
          currency: a.currency as string,
          startingBalance: a.startingBalance as number,
          color: a.color as string,
          icon: (a.icon as string) ?? "wallet",
          isHidden: (a.isHidden as boolean) ?? false,
          isDefault: (a.isDefault as boolean) ?? false,
          sortOrder: (a.sortOrder as number) ?? 0,
          notes: a.notes as string | undefined,
        })),
      });
    }

    if (data.categories?.length) {
      await tx.category.createMany({
        data: data.categories.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          userId,
          name: c.name as string,
          type: c.type as "EXPENSE" | "INCOME",
          icon: (c.icon as string) ?? "tag",
          color: (c.color as string) ?? "#635BFF",
          monthlyLimit: c.monthlyLimit as number | undefined,
          isTemplate: (c.isTemplate as boolean) ?? false,
          sortOrder: (c.sortOrder as number) ?? 0,
        })),
      });
    }

    if (data.tags?.length) {
      await tx.tag.createMany({
        data: data.tags.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          userId,
          name: t.name as string,
          color: (t.color as string) ?? "#888888",
        })),
      });
    }
  });

  return NextResponse.json({ success: true });
}
