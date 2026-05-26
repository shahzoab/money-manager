"use client";

import { useState, useTransition } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import { CategoryType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColorPickerField } from "@/components/ui/color-picker-field";
import { PickerField } from "@/components/ui/picker-field";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { CategoriesReorderSheet } from "@/components/categories/categories-reorder-sheet";
import { EntityIcon } from "@/components/ui/entity-icon";
import { EntityActionsSheet } from "@/components/ui/entity-actions-sheet";
import { IconPicker } from "@/components/ui/icon-picker";
import { CATEGORY_ICONS } from "@/lib/icon-map";
import { transactionTypeStyles } from "@/lib/transaction-type-styles";
import { toast } from "sonner";

const categoryTypeOptions = [
  { value: CategoryType.EXPENSE, label: "Expense" },
  { value: CategoryType.INCOME, label: "Income" },
];

type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  monthlyLimit: number | null;
  isTemplate: boolean;
};

export function CategoriesManager({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [open, setOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, startTransition] = useTransition();
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignToId, setReassignToId] = useState<string | undefined>(undefined);

  function closeDeleteDialog() {
    setReassignId(null);
    setReassignToId(undefined);
  }

  const [form, setForm] = useState({
    name: "",
    type: CategoryType.EXPENSE as CategoryType,
    icon: "tag",
    color: "#635BFF",
    monthlyLimit: undefined as number | undefined,
  });

  function resetForm() {
    setForm({ name: "", type: CategoryType.EXPENSE, icon: "tag", color: "#635BFF", monthlyLimit: undefined });
    setEditing(null);
  }

  const activeType =
    activeTab === "expense" ? CategoryType.EXPENSE : CategoryType.INCOME;

  function applyCategoryOrder(type: CategoryType, orderedIds: string[]) {
    const otherCategories = categories.filter((category) => category.type !== type);
    const byId = new Map(categories.map((category) => [category.id, category]));
    const reordered = orderedIds.flatMap((id) => {
      const category = byId.get(id);
      return category ? [category] : [];
    });
    setCategories([...otherCategories, ...reordered]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editing) {
          await updateCategory(editing.id, form);
          toast.success("Category updated");
        } else {
          await createCategory(form);
          toast.success("Category created");
        }
        setOpen(false);
        resetForm();
        window.location.reload();
      } catch {
        toast.error("Failed to save category");
      }
    });
  }

  function openEditCategory(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      monthlyLimit: cat.monthlyLimit ?? undefined,
    });
    setOpen(true);
  }

  function renderList(type: CategoryType) {
    const list = categories.filter((c) => c.type === type);
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((cat) => (
          <Card key={cat.id} className="border-border/60 bg-surface">
            <CardContent className="flex items-center gap-2 p-4">
              <div
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg transition-colors hover:bg-surface-elevated/50 active:bg-surface-elevated"
                role="button"
                tabIndex={0}
                onClick={() => openEditCategory(cat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEditCategory(cat);
                  }
                }}
              >
                <EntityIcon icon={cat.icon} color={cat.color} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{cat.name}</p>
                  {cat.monthlyLimit && (
                    <p className="text-xs text-muted-foreground">
                      Limit: {cat.monthlyLimit}
                    </p>
                  )}
                </div>
              </div>
              <EntityActionsSheet
                entityName={cat.name}
                icon={cat.icon}
                color={cat.color}
                editLabel="Edit category"
                deleteLabel="Delete category"
                onEdit={() => openEditCategory(cat)}
                onDelete={() => {
                  setReassignId(cat.id);
                  setReassignToId(undefined);
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setReorderOpen(true)}>
          <ArrowUpDown className="h-4 w-4" />
          Reorder
        </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <PickerField
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as CategoryType })}
                  options={categoryTypeOptions}
                  placeholder="Select type"
                  title="Select type"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPickerField
                  value={form.color}
                  onChange={(color) => setForm({ ...form, color })}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker
                  icons={CATEGORY_ICONS}
                  value={form.icon}
                  onChange={(icon) => setForm({ ...form, icon })}
                  color={form.color}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Limit (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.monthlyLimit ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, monthlyLimit: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {editing ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "expense" | "income")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-surface-elevated p-1">
          <TabsTrigger
            value="expense"
            className={transactionTypeStyles(CategoryType.EXPENSE).tab}
          >
            Expenses
          </TabsTrigger>
          <TabsTrigger
            value="income"
            className={transactionTypeStyles(CategoryType.INCOME).tab}
          >
            Income
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="mt-4">{renderList(CategoryType.EXPENSE)}</TabsContent>
        <TabsContent value="income" className="mt-4">{renderList(CategoryType.INCOME)}</TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!reassignId}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
        title="Delete Category"
        description="This category will be permanently deleted."
        loading={pending}
        onConfirm={() => {
          if (!reassignId) return;
          startTransition(async () => {
            await deleteCategory(reassignId, reassignToId);
            toast.success("Category deleted");
            closeDeleteDialog();
            window.location.reload();
          });
        }}
      >
        <p className="text-sm text-muted-foreground">
          Reassign transactions to another category (optional):
        </p>
        <PickerField
          value={reassignToId ?? "none"}
          onValueChange={(v) => setReassignToId(v === "none" ? undefined : v)}
          options={[
            { value: "none", label: "Don't reassign" },
            ...categories
              .filter((c) => c.id !== reassignId)
              .map((c) => ({ value: c.id, label: c.name })),
          ]}
          placeholder="Select category"
          title="Reassign transactions"
        />
      </ConfirmDialog>

      <CategoriesReorderSheet
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        type={activeType}
        categories={categories.filter((category) => category.type === activeType)}
        onReordered={(orderedIds) => applyCategoryOrder(activeType, orderedIds)}
      />
    </>
  );
}
