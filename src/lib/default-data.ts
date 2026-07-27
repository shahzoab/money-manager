import { CategoryType } from "@/generated/prisma/client";

export const DEFAULT_CATEGORIES = [
  { name: "Groceries", type: CategoryType.EXPENSE, icon: "shopping-cart", color: "#22C55E" },
  { name: "Restaurants", type: CategoryType.EXPENSE, icon: "utensils", color: "#F97316" },
  { name: "Transport", type: CategoryType.EXPENSE, icon: "car", color: "#3B82F6" },
  { name: "Utilities", type: CategoryType.EXPENSE, icon: "zap", color: "#EAB308" },
  { name: "Entertainment", type: CategoryType.EXPENSE, icon: "gamepad-2", color: "#A855F7" },
  { name: "Health", type: CategoryType.EXPENSE, icon: "heart-pulse", color: "#EF4444" },
  { name: "Shopping", type: CategoryType.EXPENSE, icon: "shopping-bag", color: "#EC4899" },
  { name: "Housing", type: CategoryType.EXPENSE, icon: "home", color: "#6366F1" },
  { name: "Salary", type: CategoryType.INCOME, icon: "briefcase", color: "#10B981" },
  { name: "Freelance", type: CategoryType.INCOME, icon: "laptop", color: "#14B8A6" },
  { name: "Investments", type: CategoryType.INCOME, icon: "trending-up", color: "#8B5CF6" },
  { name: "Other Income", type: CategoryType.INCOME, icon: "plus-circle", color: "#64748B" },
] as const;

export function defaultCategoryRows(userId: string) {
  return DEFAULT_CATEGORIES.map((category, sortOrder) => ({
    ...category,
    userId,
    isTemplate: true,
    sortOrder,
  }));
}

export function defaultWalletAccountRow(userId: string) {
  return {
    userId,
    name: "Cash",
    currency: "USD",
    isDefault: true,
    color: "#635BFF",
    icon: "wallet",
  };
}
