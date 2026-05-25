"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CategoryType } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { serializeCategory } from "@/lib/serialize";

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(CategoryType),
  icon: z.string().default("tag"),
  color: z.string().default("#635BFF"),
  monthlyLimit: z.number().optional(),
});

const categoryOrderBy = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

export async function getCategories(type?: CategoryType) {
  const session = await requireSession();
  const categories = await db.category.findMany({
    where: {
      userId: session.user.id,
      ...(type ? { type } : {}),
    },
    orderBy: categoryOrderBy,
  });
  return categories.map(serializeCategory);
}

async function nextCategorySortOrder(userId: string, type: CategoryType): Promise<number> {
  const max = await db.category.aggregate({
    where: { userId, type },
    _max: { sortOrder: true },
  });
  return (max._max.sortOrder ?? -1) + 1;
}

export async function createCategory(input: z.infer<typeof categorySchema>) {
  const session = await requireSession();
  const data = categorySchema.parse(input);
  const sortOrder = await nextCategorySortOrder(session.user.id, data.type);

  const category = await db.category.create({
    data: { ...data, userId: session.user.id, sortOrder },
  });

  revalidatePath("/categories");
  return category;
}

export async function updateCategory(
  id: string,
  input: Partial<z.infer<typeof categorySchema>>,
) {
  const session = await requireSession();
  const data = categorySchema.partial().parse(input);

  const category = await db.category.update({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath("/categories");
  revalidatePath("/charts");
  return category;
}

export async function reorderCategories(type: CategoryType, orderedIds: string[]) {
  const session = await requireSession();
  const userId = session.user.id;

  const existing = await db.category.findMany({
    where: { userId, type },
    select: { id: true },
    orderBy: categoryOrderBy,
  });

  const existingIds = existing.map((c) => c.id);
  if (
    orderedIds.length !== existingIds.length ||
    !orderedIds.every((id) => existingIds.includes(id))
  ) {
    throw new Error("Invalid category order");
  }

  await db.$transaction(
    orderedIds.map((id, sortOrder) =>
      db.category.update({
        where: { id, userId },
        data: { sortOrder },
      }),
    ),
  );

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/charts");
}

export async function deleteCategory(id: string, reassignToId?: string) {
  const session = await requireSession();

  if (reassignToId) {
    await db.transaction.updateMany({
      where: { categoryId: id, userId: session.user.id },
      data: { categoryId: reassignToId },
    });
  }

  await db.category.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/categories");
}
