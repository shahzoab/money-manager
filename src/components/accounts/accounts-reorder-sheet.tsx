"use client";

import { reorderAccounts } from "@/actions/accounts";
import {
  SortableReorderSheet,
  type ReorderItem,
} from "@/components/ui/sortable-reorder-sheet";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  color: string;
  isHidden: boolean;
};

type AccountsReorderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onReordered: (orderedIds: string[]) => void;
};

export function AccountsReorderSheet({
  open,
  onOpenChange,
  accounts,
  onReordered,
}: AccountsReorderSheetProps) {
  const items: ReorderItem[] = accounts.map((account) => ({
    id: account.id,
    label: account.name,
    color: account.color,
    badge: account.isHidden ? "Hidden" : undefined,
  }));

  async function handleSave(orderedIds: string[]) {
    try {
      await reorderAccounts(orderedIds);
      onReordered(orderedIds);
      toast.success("Account order saved");
    } catch {
      toast.error("Failed to save account order");
      throw new Error("Failed to save account order");
    }
  }

  return (
    <SortableReorderSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reorder accounts"
      description="Drag accounts or use the arrows to change their display order."
      items={items}
      onSave={handleSave}
    />
  );
}
