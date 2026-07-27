"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  TransactionType,
  RecurringFrequency,
  CategoryType,
  DecimalSeparator,
  RoundingMode,
} from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { assertActiveWalletAccounts } from "@/lib/accounts";
import { db } from "@/lib/db";
import { processDueRecurringPaymentsForUser } from "@/lib/recurring-processing";
import {
  loadActiveRecurringPayments,
  loadUpcomingRecurringPayments,
  loadUserSettings,
  loadUserTags,
} from "@/lib/data-loaders";
import { expireUserCache } from "@/lib/cache-invalidation";

const recurringSchema = z.object({
  type: z.union([
    z.literal(TransactionType.EXPENSE),
    z.literal(TransactionType.INCOME),
  ]),
  amount: z.number().positive(),
  frequency: z.nativeEnum(RecurringFrequency),
  nextDueDate: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  autoCreate: z.boolean().default(true),
  comment: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
});

async function assertRecurringRelations(
  userId: string,
  data: Partial<z.infer<typeof recurringSchema>>,
) {
  await assertActiveWalletAccounts(userId, [data.accountId]);

  if (data.categoryId) {
    const category = await db.category.findFirst({
      where: {
        id: data.categoryId,
        userId,
        type:
          data.type === TransactionType.INCOME
            ? CategoryType.INCOME
            : CategoryType.EXPENSE,
      },
      select: { id: true },
    });
    if (!category) {
      throw new Error("Category not found");
    }
  }

  if (data.tagIds?.length) {
    const uniqueTagIds = [...new Set(data.tagIds)];
    const count = await db.tag.count({
      where: { id: { in: uniqueTagIds }, userId },
    });
    if (count !== uniqueTagIds.length) {
      throw new Error("Tag not found");
    }
  }
}

export async function getRecurringPayments(search?: string) {
  const session = await requireSession();
  return loadActiveRecurringPayments(session.user.id, search);
}

export async function getUpcomingPayments(days = 30) {
  const session = await requireSession();
  return loadUpcomingRecurringPayments(session.user.id, days);
}

export async function createRecurringPayment(
  input: z.infer<typeof recurringSchema>,
) {
  const session = await requireSession();
  const data = recurringSchema.parse(input);
  await assertRecurringRelations(session.user.id, data);

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

  expireUserCache(session.user.id, ["recurring"]);
  revalidatePath("/recurring");
  return payment;
}

export async function updateRecurringPayment(
  id: string,
  input: Partial<z.infer<typeof recurringSchema>>,
) {
  const session = await requireSession();
  const data = recurringSchema.partial().parse(input);
  await assertRecurringRelations(session.user.id, data);

  const { tagIds, ...paymentData } = data;
  const payment = await db.$transaction(async (tx) => {
    await tx.recurringPayment.findFirstOrThrow({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (tagIds !== undefined) {
      await tx.recurringPaymentTag.deleteMany({
        where: { recurringPaymentId: id },
      });
    }

    return tx.recurringPayment.update({
      where: { id, userId: session.user.id },
      data: {
        ...paymentData,
        ...(tagIds !== undefined && {
          tags: tagIds.length
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        }),
      },
    });
  });

  expireUserCache(session.user.id, ["recurring"]);
  revalidatePath("/recurring");
  return payment;
}

export async function deleteRecurringPayment(id: string) {
  const session = await requireSession();
  await db.recurringPayment.update({
    where: { id, userId: session.user.id },
    data: { isActive: false },
  });
  expireUserCache(session.user.id, ["recurring"]);
  revalidatePath("/recurring");
}

export async function processDueRecurringPayments() {
  const session = await requireSession();
  const result = await processDueRecurringPaymentsForUser(session.user.id);

  expireUserCache(session.user.id, [
    "recurring",
    "transactions",
    "comments",
  ]);
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/charts");
  return result;
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
  return loadUserSettings(session.user.id);
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

  expireUserCache(session.user.id, ["settings"]);
  revalidatePath("/settings");
  return settings;
}

export async function getTags() {
  const session = await requireSession();
  return loadUserTags(session.user.id);
}

export async function createTag(name: string, color = "#888888") {
  const session = await requireSession();
  const tag = await db.tag.create({
    data: { userId: session.user.id, name, color },
  });
  expireUserCache(session.user.id, ["tags"]);
  revalidatePath("/settings");
  return tag;
}

export async function updateTag(id: string, name: string, color?: string) {
  const session = await requireSession();
  const tag = await db.tag.update({
    where: { id, userId: session.user.id },
    data: { name, ...(color && { color }) },
  });
  expireUserCache(session.user.id, ["tags", "transactions", "recurring"]);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  return tag;
}

export async function deleteTag(id: string) {
  const session = await requireSession();
  await db.tag.delete({ where: { id, userId: session.user.id } });
  expireUserCache(session.user.id, ["tags", "transactions", "recurring"]);
  revalidatePath("/settings");
}
