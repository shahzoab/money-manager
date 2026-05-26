"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
  color: string;
  fallback?: "tag" | "wallet";
};

export function IconPicker({
  icons,
  value,
  onChange,
  color,
  fallback = "tag",
}: IconPickerProps) {
  return (
    <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-lg border border-border/60 bg-surface-elevated/30 p-2">
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          className={cn(
            "rounded-lg p-0.5 transition-colors hover:bg-surface-elevated",
            value === icon && "ring-2 ring-accent ring-offset-2 ring-offset-background",
          )}
          aria-label={icon}
          aria-pressed={value === icon}
        >
          <EntityIcon icon={icon} color={color} size="sm" fallback={fallback} />
        </button>
      ))}
    </div>
  );
}
