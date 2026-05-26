import { getCategories } from "@/actions/categories";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { CategoriesManager } from "@/components/categories/categories-manager";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitleClass}>Categories</h1>
        <p className={pageSubtitleClass}>
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
