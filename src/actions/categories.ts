"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CategoryType } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(CategoryType),
  icon: z.string().default("tag"),
  color: z.string().default("#635BFF"),
  monthlyLimit: z.number().optional(),
});

export async function getCategories(type?: CategoryType) {
  const session = await requireSession();
  return db.category.findMany({
    where: {
      userId: session.user.id,
      ...(type ? { type } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(input: z.infer<typeof categorySchema>) {
  const session = await requireSession();
  const data = categorySchema.parse(input);

  const category = await db.category.create({
    data: { ...data, userId: session.user.id },
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
