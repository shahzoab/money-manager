"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import type { IconGroup } from "@/lib/icon-map";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  groups: IconGroup[];
  value: string;
  onChange: (icon: string) => void;
  color: string;
  fallback?: "tag" | "wallet";
};

export function IconPicker({
  groups,
  value,
  onChange,
  color,
  fallback = "tag",
}: IconPickerProps) {
  const isMobile = useIsMobile();

  return (
    <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-border/60 bg-surface-elevated/30 p-2">
      {groups.map((group) => (
        <section key={group.label}>
          <h4 className="mb-2 px-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </h4>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {group.icons.map((icon) => (
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
                  size={isMobile ? "xl" : "md"}
                  fallback={fallback}
                />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
