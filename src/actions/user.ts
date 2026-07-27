"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-server";
import { expireUserCache } from "@/lib/cache-invalidation";

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

  expireUserCache(session.user.id, ["settings"]);
  revalidatePath("/settings");
}
