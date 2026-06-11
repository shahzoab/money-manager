import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";

type BackupRecord = Record<string, unknown>;

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function asNullableDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  return asDate(value);
}

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

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
        data: data.accounts.map((a: BackupRecord) => ({
          id: asString(a.id),
          userId,
          name: asString(a.name) ?? "Account",
          currency: asString(a.currency) ?? "USD",
          startingBalance: asNumber(a.startingBalance) ?? 0,
          color: asString(a.color) ?? "#635BFF",
          icon: (a.icon as string) ?? "wallet",
          isHidden: (a.isHidden as boolean) ?? false,
          isDefault: (a.isDefault as boolean) ?? false,
          sortOrder: (a.sortOrder as number) ?? 0,
          notes: a.notes as string | undefined,
          deletedAt: asNullableDate(a.deletedAt),
          createdAt: asDate(a.createdAt),
          updatedAt: asDate(a.updatedAt),
        })),
      });
    }

    if (data.categories?.length) {
      await tx.category.createMany({
        data: data.categories.map((c: BackupRecord) => ({
          id: asString(c.id),
          userId,
          name: asString(c.name) ?? "Category",
          type: c.type as "EXPENSE" | "INCOME",
          icon: (c.icon as string) ?? "tag",
          color: (c.color as string) ?? "#635BFF",
          monthlyLimit: asNumber(c.monthlyLimit),
          isTemplate: (c.isTemplate as boolean) ?? false,
          sortOrder: (c.sortOrder as number) ?? 0,
          createdAt: asDate(c.createdAt),
          updatedAt: asDate(c.updatedAt),
        })),
      });
    }

    if (data.tags?.length) {
      await tx.tag.createMany({
        data: data.tags.map((t: BackupRecord) => ({
          id: asString(t.id),
          userId,
          name: asString(t.name) ?? "Tag",
          color: (t.color as string) ?? "#888888",
          createdAt: asDate(t.createdAt),
          updatedAt: asDate(t.updatedAt),
        })),
      });
    }

    if (data.settings) {
      const s = data.settings as BackupRecord;
      await tx.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          defaultCurrency: asString(s.defaultCurrency) ?? "USD",
          decimalSeparator: s.decimalSeparator as "DOT" | "COMMA" | undefined,
          roundingMode: s.roundingMode as "NONE" | "NEAREST" | "UP" | "DOWN" | undefined,
          firstDayOfWeek: asNumber(s.firstDayOfWeek) ?? 1,
          financialWeekStart: asNumber(s.financialWeekStart) ?? 1,
          homePeriod: asString(s.homePeriod) ?? "month",
          appLockEnabled: (s.appLockEnabled as boolean) ?? false,
          appLockHash: s.appLockHash as string | null | undefined,
          locale: asString(s.locale) ?? "en",
          createdAt: asDate(s.createdAt),
          updatedAt: asDate(s.updatedAt),
        },
        update: {
          defaultCurrency: asString(s.defaultCurrency) ?? "USD",
          decimalSeparator: s.decimalSeparator as "DOT" | "COMMA" | undefined,
          roundingMode: s.roundingMode as "NONE" | "NEAREST" | "UP" | "DOWN" | undefined,
          firstDayOfWeek: asNumber(s.firstDayOfWeek) ?? 1,
          financialWeekStart: asNumber(s.financialWeekStart) ?? 1,
          homePeriod: asString(s.homePeriod) ?? "month",
          appLockEnabled: (s.appLockEnabled as boolean) ?? false,
          appLockHash: s.appLockHash as string | null | undefined,
          locale: asString(s.locale) ?? "en",
        },
      });
    }

    if (data.recurring?.length) {
      await tx.recurringPayment.createMany({
        data: data.recurring.map((r: BackupRecord) => ({
          id: asString(r.id),
          userId,
          type: r.type as "EXPENSE" | "INCOME" | "TRANSFER",
          amount: asNumber(r.amount) ?? 0,
          frequency: r.frequency as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
          nextDueDate: asDate(r.nextDueDate) ?? new Date(),
          reminderAt: asNullableDate(r.reminderAt),
          autoCreate: (r.autoCreate as boolean) ?? false,
          comment: r.comment as string | null | undefined,
          categoryId: r.categoryId as string | null | undefined,
          accountId: r.accountId as string | null | undefined,
          isActive: (r.isActive as boolean) ?? true,
          createdAt: asDate(r.createdAt),
          updatedAt: asDate(r.updatedAt),
        })),
      });
    }

    if (data.transactions?.length) {
      await tx.transaction.createMany({
        data: data.transactions.map((t: BackupRecord) => ({
          id: asString(t.id),
          userId,
          type: t.type as "EXPENSE" | "INCOME" | "TRANSFER",
          amount: asNumber(t.amount) ?? 0,
          toAmount: asNumber(t.toAmount),
          amountInBaseCurrency: asNumber(t.amountInBaseCurrency) ?? asNumber(t.amount) ?? 0,
          exchangeRate: asNumber(t.exchangeRate),
          date: asDate(t.date) ?? new Date(),
          comment: t.comment as string | null | undefined,
          photoUrl: t.photoUrl as string | null | undefined,
          categoryId: t.categoryId as string | null | undefined,
          fromAccountId: t.fromAccountId as string | null | undefined,
          toAccountId: t.toAccountId as string | null | undefined,
          recurringPaymentId: t.recurringPaymentId as string | null | undefined,
          isReconciliation: (t.isReconciliation as boolean) ?? false,
          createdAt: asDate(t.createdAt),
          updatedAt: asDate(t.updatedAt),
        })),
      });
    }

    const transactionTagRows = (data.transactions ?? []).flatMap((t: BackupRecord) =>
      ((t.tags as BackupRecord[] | undefined) ?? [])
        .map((link) => ({
          transactionId: asString(link.transactionId) ?? asString(t.id),
          tagId: asString(link.tagId),
        }))
        .filter(
          (link): link is { transactionId: string; tagId: string } =>
            !!link.transactionId && !!link.tagId,
        ),
    );

    if (transactionTagRows.length) {
      await tx.transactionTag.createMany({
        data: transactionTagRows,
        skipDuplicates: true,
      });
    }

    const recurringTagRows = (data.recurring ?? []).flatMap((r: BackupRecord) =>
      ((r.tags as BackupRecord[] | undefined) ?? [])
        .map((link) => ({
          recurringPaymentId: asString(link.recurringPaymentId) ?? asString(r.id),
          tagId: asString(link.tagId),
        }))
        .filter(
          (link): link is { recurringPaymentId: string; tagId: string } =>
            !!link.recurringPaymentId && !!link.tagId,
        ),
    );

    if (recurringTagRows.length) {
      await tx.recurringPaymentTag.createMany({
        data: recurringTagRows,
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/charts");
  revalidatePath("/recurring");
  revalidatePath("/accounts");
  revalidatePath("/categories");
  revalidatePath("/settings");

  return NextResponse.json({ success: true });
}
