"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { toast } from "sonner";

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
  const [categories] = useState(initial);
  const [open, setOpen] = useState(false);
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

  function renderList(type: CategoryType) {
    const list = categories.filter((c) => c.type === type);
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((cat) => (
          <Card key={cat.id} className="border-border/60 bg-surface">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ background: `${cat.color}33`, border: `2px solid ${cat.color}` }}
                />
                <div>
                  <p className="font-medium">{cat.name}</p>
                  {cat.monthlyLimit && (
                    <p className="text-xs text-muted-foreground">
                      Limit: {cat.monthlyLimit}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditing(cat);
                    setForm({
                      name: cat.name,
                      type: cat.type,
                      icon: cat.icon,
                      color: cat.color,
                      monthlyLimit: cat.monthlyLimit ?? undefined,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400"
                  onClick={() => {
                    setReassignId(cat.id);
                    setReassignToId(undefined);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CategoryType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CategoryType.EXPENSE}>Expense</SelectItem>
                      <SelectItem value={CategoryType.INCOME}>Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
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

      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
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
        <Select
          value={reassignToId ?? "none"}
          onValueChange={(v) => setReassignToId(v === "none" ? undefined : v)}
        >
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Don&apos;t reassign</SelectItem>
            {categories.filter((c) => c.id !== reassignId).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ConfirmDialog>
    </>
  );
}
