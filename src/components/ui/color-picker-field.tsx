"use client";

import { useRef } from "react";
import { Check, Pipette } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export const PRESET_COLORS = [
  "#635BFF",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#64748B",
  "#888888",
  "#14B8A6",
  "#EAB308",
  "#84CC16",
  "#F43F5E",
] as const;

type ColorPickerFieldProps = {
  value: string;
  onChange: (color: string) => void;
};

function isPresetColor(color: string): color is (typeof PRESET_COLORS)[number] {
  return PRESET_COLORS.includes(color as (typeof PRESET_COLORS)[number]);
}

function ColorSwatch({
  color,
  selected,
  onClick,
  large,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-xl border-2 transition-transform active:scale-95",
        large ? "h-12 w-12" : "h-10 w-10",
        selected
          ? "border-foreground ring-2 ring-accent ring-offset-2 ring-offset-background"
          : "border-transparent hover:border-border/80",
      )}
      style={{ backgroundColor: color }}
      aria-label={color}
      aria-pressed={selected}
    >
      {selected ? <Check className="h-4 w-4 text-white drop-shadow-sm" aria-hidden /> : null}
    </button>
  );
}

export function ColorPickerField({ value, onChange }: ColorPickerFieldProps) {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const isCustom = !isPresetColor(value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {PRESET_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            selected={value === color}
            onClick={() => onChange(color)}
            large={isMobile}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-elevated/60 active:bg-surface-elevated sm:min-h-10 sm:flex-none",
            isCustom && "ring-2 ring-accent ring-offset-2 ring-offset-background",
          )}
        >
          <span
            className="h-8 w-8 shrink-0 rounded-lg border border-border/60"
            style={{ backgroundColor: isCustom ? value : "transparent" }}
          />
          <Pipette className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium max-lg:text-base">Custom color</span>
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        {isCustom ? (
          <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
            {value.toUpperCase()}
          </span>
        ) : null}
      </div>
    </div>
  );
}
