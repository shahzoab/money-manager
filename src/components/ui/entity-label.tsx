"use client";

import { getEntityColorStyle } from "@/lib/entity-color-styles";
import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: "rounded-md px-1.5 py-0.5 text-xs",
  md: "rounded-lg px-2 py-1 text-sm",
  lg: "rounded-lg px-2.5 py-1 text-base font-semibold",
} as const;

type EntityLabelProps = {
  color: string;
  size?: keyof typeof sizeStyles;
  className?: string;
  children: React.ReactNode;
};

export function EntityLabel({
  color,
  size = "md",
  className,
  children,
}: EntityLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center truncate font-medium text-white",
        sizeStyles[size],
        className,
      )}
      style={getEntityColorStyle(color)}
    >
      {children}
    </span>
  );
}
