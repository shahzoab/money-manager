export const USER_CACHE_REVALIDATE_SECONDS = 300;

export type UserCacheArea =
  | "accounts"
  | "categories"
  | "comments"
  | "recurring"
  | "settings"
  | "tags"
  | "transactions";

export function userCacheTag(userId: string, area: UserCacheArea): string {
  return `user:${userId}:${area}`;
}

export function userCacheTags(
  userId: string,
  areas: readonly UserCacheArea[],
): string[] {
  return areas.map((area) => userCacheTag(userId, area));
}
