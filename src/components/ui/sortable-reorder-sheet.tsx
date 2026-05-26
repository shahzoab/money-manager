"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EntityIcon } from "@/components/ui/entity-icon";
import { cn } from "@/lib/utils";

export type ReorderItem = {
  id: string;
  label: string;
  color?: string;
  icon?: string;
  iconFallback?: "tag" | "wallet";
  badge?: string;
};

type SortableReorderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: ReorderItem[];
  onSave: (orderedIds: string[]) => Promise<void>;
};

function SortableRow({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  item: ReorderItem;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/60 bg-surface px-4 py-3",
        isDragging && "z-10 opacity-80 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {item.icon && item.color ? (
        <EntityIcon
          icon={item.icon}
          color={item.color}
          size="sm"
          fallback={item.iconFallback}
        />
      ) : item.color ? (
        <div
          className="h-6 w-6 shrink-0 rounded-md"
          style={{ background: item.color }}
        />
      ) : null}

      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>

      {item.badge && (
        <span className="shrink-0 rounded bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground">
          {item.badge}
        </span>
      )}

      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={index === 0}
          onClick={onMoveUp}
          aria-label={`Move ${item.label} up`}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={index === total - 1}
          onClick={onMoveDown}
          aria-label={`Move ${item.label} down`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SortableReorderSheet({
  open,
  onOpenChange,
  title,
  description,
  items: initialItems,
  onSave,
}: SortableReorderSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-6 sm:max-w-md">
        <SheetHeader className="space-y-2 pr-8">
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </SheetHeader>

        {open ? (
          <ReorderList
            key={initialItems.map((item) => item.id).join(",")}
            items={initialItems}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ReorderList({
  items: initialItems,
  onSave,
  onCancel,
}: {
  items: ReorderItem[];
  onSave: (orderedIds: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    setItems((current) => arrayMove(current, index, newIndex));
  }

  function handleSave() {
    startTransition(async () => {
      await onSave(items.map((item) => item.id));
      onCancel();
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 space-y-3 overflow-y-auto py-5">
            {items.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-auto flex gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleSave}
          disabled={pending || items.length === 0}
        >
          {pending ? "Saving..." : "Save order"}
        </Button>
      </div>
    </>
  );
}
