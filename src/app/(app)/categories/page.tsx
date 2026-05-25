import { getCategories } from "@/actions/categories";
import { CategoriesManager } from "@/components/categories/categories-manager";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Organize your income and expenses
        </p>
      </div>
      <CategoriesManager categories={categories.map((c) => ({
        ...c,
        monthlyLimit: c.monthlyLimit ? Number(c.monthlyLimit) : null,
      }))} />
    </div>
  );
}
