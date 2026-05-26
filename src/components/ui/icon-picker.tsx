"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import { useIsMobile } from "@/hooks/use-media-query";
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
  const isMobile = useIsMobile();

  return (
    <div className="grid max-h-56 grid-cols-5 gap-1 overflow-y-auto rounded-lg border border-border/60 bg-surface-elevated/30 p-1.5">
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          className={cn(
            "flex items-center justify-center rounded-md p-0 transition-colors hover:bg-surface-elevated",
            value === icon && "ring-2 ring-accent ring-offset-1 ring-offset-background",
          )}
          aria-label={icon}
          aria-pressed={value === icon}
        >
          <EntityIcon
            icon={icon}
            color={color}
            iconColor="#ffffff"
            size={isMobile ? "xl" : "md"}
            fallback={fallback}
          />
        </button>
      ))}
    </div>
  );
}
