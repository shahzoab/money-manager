"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export type PickerOption = {
  value: string;
  label: React.ReactNode;
};

type PickerFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  placeholder: string;
  title: string;
  emptyMessage?: string;
  disabled?: boolean;
};

function PickerTrigger({
  selectedLabel,
  placeholder,
  disabled,
  onClick,
}: {
  selectedLabel: React.ReactNode | null;
  placeholder: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span className={cn(!selectedLabel && "text-muted-foreground")}>
        {selectedLabel ?? placeholder}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
    </button>
  );
}

function MobilePickerSheet({
  open,
  onOpenChange,
  title,
  value,
  onValueChange,
  options,
  emptyMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  emptyMessage?: string;
}) {
  function handleSelect(optionValue: string) {
    onValueChange(optionValue);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[75vh] flex-col gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" />
        <SheetHeader className="shrink-0 px-4 pb-2 pt-3 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {options.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage ?? "No options available"}
            </p>
          ) : (
            <ul className="space-y-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-surface-elevated font-medium"
                          : "hover:bg-surface-elevated/60 active:bg-surface-elevated",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {option.label}
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                      ) : (
                        <span className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PickerField({
  value,
  onValueChange,
  options,
  placeholder,
  title,
  emptyMessage,
  disabled,
}: PickerFieldProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? null;

  if (isMobile) {
    return (
      <>
        <PickerTrigger
          selectedLabel={selectedLabel}
          placeholder={placeholder}
          disabled={disabled}
          onClick={() => !disabled && setSheetOpen(true)}
        />
        <MobilePickerSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={title}
          value={value}
          onValueChange={onValueChange}
          options={options}
          emptyMessage={emptyMessage}
        />
      </>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage ?? "No options available"}
          </div>
        ) : (
          options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
