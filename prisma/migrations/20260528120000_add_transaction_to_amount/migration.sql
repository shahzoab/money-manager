-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "toAmount" DECIMAL(18,4);

-- Backfill same-currency transfers
UPDATE "Transaction" t
SET "toAmount" = t."amount"
FROM "WalletAccount" fa, "WalletAccount" ta
WHERE t."type" = 'TRANSFER'
  AND t."fromAccountId" = fa."id"
  AND t."toAccountId" = ta."id"
  AND fa."currency" = ta."currency";
