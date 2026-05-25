"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  TransactionType,
  RecurringFrequency,
  DecimalSeparator,
  RoundingMode,
} from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { serializeRecurringPayment } from "@/lib/serialize";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";

const recurringSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  frequency: z.nativeEnum(RecurringFrequency),
  nextDueDate: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  autoCreate: z.boolean().default(false),
  comment: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

function getNextDueDate(date: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case RecurringFrequency.DAILY:
      return addDays(date, 1);
    case RecurringFrequency.WEEKLY:
      return addWeeks(date, 1);
    case RecurringFrequency.MONTHLY:
      return addMonths(date, 1);
    case RecurringFrequency.YEARLY:
      return addYears(date, 1);
  }
}

export async function getRecurringPayments(search?: string) {
  const session = await requireSession();
  const payments = await db.recurringPayment.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      ...(search
        ? { comment: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: {
      category: true,
      account: true,
      tags: { include: { tag: true } },
    },
    orderBy: { nextDueDate: "asc" },
  });
  return payments.map(serializeRecurringPayment);
}

export async function getUpcomingPayments(days = 30) {
  const session = await requireSession();
  const until = addDays(new Date(), days);
  const payments = await db.recurringPayment.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      nextDueDate: { lte: until },
    },
    include: { category: true, account: true },
    orderBy: { nextDueDate: "asc" },
  });
  return payments.map(serializeRecurringPayment);
}

export async function createRecurringPayment(
  input: z.infer<typeof recurringSchema>,
) {
  const session = await requireSession();
  const data = recurringSchema.parse(input);

  const payment = await db.recurringPayment.create({
    data: {
      userId: session.user.id,
      type: data.type,
      amount: data.amount,
      frequency: data.frequency,
      nextDueDate: data.nextDueDate,
      reminderAt: data.reminderAt,
      autoCreate: data.autoCreate,
      comment: data.comment,
      categoryId: data.categoryId,
      accountId: data.accountId,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
  });

  revalidatePath("/recurring");
  return payment;
}

export async function updateRecurringPayment(
  id: string,
  input: Partial<z.infer<typeof recurringSchema>>,
) {
  const session = await requireSession();
  const data = recurringSchema.partial().parse(input);

  const payment = await db.recurringPayment.update({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath("/recurring");
  return payment;
}

export async function deleteRecurringPayment(id: string) {
  const session = await requireSession();
  await db.recurringPayment.update({
    where: { id, userId: session.user.id },
    data: { isActive: false },
  });
  revalidatePath("/recurring");
}

export async function processDueRecurringPayments() {
  const session = await requireSession();
  const due = await db.recurringPayment.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      autoCreate: true,
      nextDueDate: { lte: new Date() },
    },
  });

  const { createTransaction } = await import("@/actions/transactions");

  for (const payment of due) {
    const isExpense = payment.type === TransactionType.EXPENSE;
    const isIncome = payment.type === TransactionType.INCOME;

    await createTransaction({
      type: payment.type,
      amount: Number(payment.amount),
      date: payment.nextDueDate,
      comment: payment.comment ?? undefined,
      categoryId: payment.categoryId ?? undefined,
      fromAccountId: isExpense ? payment.accountId ?? undefined : undefined,
      toAccountId: isIncome ? payment.accountId ?? undefined : undefined,
    });

    await db.recurringPayment.update({
      where: { id: payment.id },
      data: {
        nextDueDate: getNextDueDate(payment.nextDueDate, payment.frequency),
      },
    });
  }

  revalidatePath("/recurring");
  revalidatePath("/transactions");
  return due.length;
}

const settingsSchema = z.object({
  defaultCurrency: z.string().length(3).optional(),
  decimalSeparator: z.nativeEnum(DecimalSeparator).optional(),
  roundingMode: z.nativeEnum(RoundingMode).optional(),
  firstDayOfWeek: z.number().min(0).max(6).optional(),
  financialWeekStart: z.number().min(0).max(6).optional(),
  homePeriod: z.string().optional(),
  appLockEnabled: z.boolean().optional(),
  appLockHash: z.string().optional(),
  locale: z.string().optional(),
});

export async function getSettings() {
  const session = await requireSession();
  return db.userSettings.findUnique({
    where: { userId: session.user.id },
  });
}

export async function updateSettings(
  input: z.infer<typeof settingsSchema>,
) {
  const session = await requireSession();
  const data = settingsSchema.parse(input);

  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  revalidatePath("/settings");
  return settings;
}

export async function getTags() {
  const session = await requireSession();
  return db.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });
}

export async function createTag(name: string, color = "#888888") {
  const session = await requireSession();
  const tag = await db.tag.create({
    data: { userId: session.user.id, name, color },
  });
  revalidatePath("/settings");
  return tag;
}

export async function updateTag(id: string, name: string, color?: string) {
  const session = await requireSession();
  const tag = await db.tag.update({
    where: { id, userId: session.user.id },
    data: { name, ...(color && { color }) },
  });
  revalidatePath("/settings");
  revalidatePath("/transactions");
  return tag;
}

export async function deleteTag(id: string) {
  const session = await requireSession();
  await db.tag.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/settings");
}
