import { CategoryType, PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  { name: "Groceries", type: CategoryType.EXPENSE, icon: "shopping-cart", color: "#22C55E" },
  { name: "Restaurants", type: CategoryType.EXPENSE, icon: "utensils", color: "#F97316" },
  { name: "Transport", type: CategoryType.EXPENSE, icon: "car", color: "#3B82F6" },
  { name: "Utilities", type: CategoryType.EXPENSE, icon: "zap", color: "#EAB308" },
  { name: "Entertainment", type: CategoryType.EXPENSE, icon: "gamepad-2", color: "#A855F7" },
  { name: "Health", type: CategoryType.EXPENSE, icon: "heart-pulse", color: "#EF4444" },
  { name: "Shopping", type: CategoryType.EXPENSE, icon: "shopping-bag", color: "#EC4899" },
  { name: "Housing", type: CategoryType.EXPENSE, icon: "housing", color: "#6366F1" },
  { name: "Salary", type: CategoryType.INCOME, icon: "briefcase", color: "#10B981" },
  { name: "Freelance", type: CategoryType.INCOME, icon: "laptop", color: "#14B8A6" },
  { name: "Investments", type: CategoryType.INCOME, icon: "trending-up", color: "#8B5CF6" },
  { name: "Other Income", type: CategoryType.INCOME, icon: "plus-circle", color: "#64748B" },
];

export async function seedDefaultCategories(userId: string) {
  const existing = await db.category.count({ where: { userId } });
  if (existing > 0) return;

  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c, i) => ({
      userId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isTemplate: true,
      sortOrder: i,
    })),
  });
}

export async function seedDefaultWalletAccount(userId: string) {
  const existing = await db.walletAccount.count({ where: { userId } });
  if (existing > 0) return;

  await db.walletAccount.create({
    data: {
      userId,
      name: "Cash",
      currency: "USD",
      isDefault: true,
      color: "#635BFF",
      icon: "wallet",
    },
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
