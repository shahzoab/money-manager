"use client";

import { CategoryType } from "@/generated/prisma/enums";
import { reorderCategories } from "@/actions/categories";
import {
  SortableReorderSheet,
  type ReorderItem,
} from "@/components/ui/sortable-reorder-sheet";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  color: string;
};

type CategoriesReorderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CategoryType;
  categories: Category[];
  onReordered: (orderedIds: string[]) => void;
};

const typeLabels: Record<CategoryType, string> = {
  [CategoryType.EXPENSE]: "expense",
  [CategoryType.INCOME]: "income",
};

export function CategoriesReorderSheet({
  open,
  onOpenChange,
  type,
  categories,
  onReordered,
}: CategoriesReorderSheetProps) {
  const items: ReorderItem[] = categories.map((category) => ({
    id: category.id,
    label: category.name,
    color: category.color,
  }));

  async function handleSave(orderedIds: string[]) {
    try {
      await reorderCategories(type, orderedIds);
      onReordered(orderedIds);
      toast.success("Category order saved");
    } catch {
      toast.error("Failed to save category order");
      throw new Error("Failed to save category order");
    }
  }

  return (
    <SortableReorderSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Reorder ${typeLabels[type]} categories`}
      description="Drag categories or use the arrows to change their display order."
      items={items}
      onSave={handleSave}
    />
  );
}
