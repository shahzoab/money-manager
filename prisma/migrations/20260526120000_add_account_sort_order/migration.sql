-- AlterTable
ALTER TABLE "WalletAccount" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill account sortOrder per user (default first, then name)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "isDefault" DESC, "name" ASC, "createdAt" ASC
    ) - 1 AS new_order
  FROM "WalletAccount"
  WHERE "deletedAt" IS NULL
)
UPDATE "WalletAccount" wa
SET "sortOrder" = ranked.new_order
FROM ranked
WHERE wa.id = ranked.id;

-- Backfill category sortOrder per user per type (preserve existing order, break ties by name)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "type"
      ORDER BY "sortOrder" ASC, "name" ASC, "createdAt" ASC
    ) - 1 AS new_order
  FROM "Category"
)
UPDATE "Category" c
SET "sortOrder" = ranked.new_order
FROM ranked
WHERE c.id = ranked.id;
