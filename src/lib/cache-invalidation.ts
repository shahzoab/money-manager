import { revalidateTag, updateTag } from "next/cache";
import {
  userCacheTags,
  type UserCacheArea,
} from "@/lib/cache-tags";

export function expireUserCache(
  userId: string,
  areas: readonly UserCacheArea[],
): void {
  for (const tag of userCacheTags(userId, areas)) {
    updateTag(tag);
  }
}

export function revalidateUserCache(
  userId: string,
  areas: readonly UserCacheArea[],
): void {
  for (const tag of userCacheTags(userId, areas)) {
    revalidateTag(tag, { expire: 0 });
  }
}
