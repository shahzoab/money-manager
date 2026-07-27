import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  defaultCategoryRows,
  defaultWalletAccountRow,
} from "../src/lib/default-data";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

export async function seedDefaultCategories(userId: string) {
  const existing = await db.category.count({ where: { userId } });
  if (existing > 0) return;

  await db.category.createMany({
    data: defaultCategoryRows(userId),
  });
}

export async function seedDefaultWalletAccount(userId: string) {
  const existing = await db.walletAccount.count({ where: { userId } });
  if (existing > 0) return;

  await db.walletAccount.create({
    data: defaultWalletAccountRow(userId),
  });
}

export async function ensureUserSettings(userId: string) {
  await db.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function main() {
  console.log("Seed helpers ready — categories and accounts are created on user signup.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
