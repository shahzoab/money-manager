"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityIcon } from "@/components/ui/entity-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type EntityActionsSheetProps = {
  entityName: string;
  icon?: string;
  color?: string;
  iconFallback?: "tag" | "wallet";
  editLabel?: string;
  deleteLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  triggerClassName?: string;
};

export function EntityActionsSheet({
  entityName,
  icon,
  color,
  iconFallback = "tag",
  editLabel = "Edit",
  deleteLabel = "Delete",
  onEdit,
  onDelete,
  triggerClassName,
}: EntityActionsSheetProps) {
  const [open, setOpen] = useState(false);

  function handleEdit() {
    setOpen(false);
    onEdit();
  }

  function handleDelete() {
    setOpen(false);
    onDelete();
  }

  return (
    <div
      className="shrink-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-11 w-11 touch-manipulation", triggerClassName)}
        aria-label={`Actions for ${entityName}`}
        onClick={() => setOpen(true)}
      >
        <MoreVertical className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 pt-6">
          <SheetHeader className="items-center pb-4 text-center">
            <div className="flex items-center justify-center gap-3">
              {icon && color ? (
                <EntityIcon icon={icon} color={color} fallback={iconFallback} />
              ) : null}
              <SheetTitle className="text-base">{entityName}</SheetTitle>
            </div>
          </SheetHeader>
          <div className="space-y-2">
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface-elevated active:bg-surface-elevated"
              onClick={handleEdit}
            >
              <Pencil className="h-5 w-5 text-muted-foreground" aria-hidden />
              {editLabel}
            </button>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 active:bg-red-500/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-5 w-5" aria-hidden />
              {deleteLabel}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
