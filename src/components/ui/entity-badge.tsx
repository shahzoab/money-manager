"use client";

import { createElement } from "react";
import { Tag, Wallet, type LucideIcon } from "lucide-react";
import { getLucideIcon } from "@/lib/icon-map";
import { getEntityColorStyle } from "@/lib/entity-color-styles";
import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: { container: "gap-1.5 rounded-md px-2 py-1 text-xs", icon: "h-3 w-3", border: "1px solid" },
  md: { container: "gap-2 rounded-lg px-2.5 py-1.5 text-sm", icon: "h-4 w-4", border: "2px solid" },
  lg: { container: "gap-2.5 rounded-lg px-3 py-2 text-base font-semibold", icon: "h-5 w-5", border: "2px solid" },
  field: {
    container:
      "min-h-12 w-full gap-3 rounded-xl px-3 py-2.5 text-lg lg:min-h-0 lg:gap-2 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm",
    icon: "h-5 w-5 lg:h-4 lg:w-4",
    border: "2px solid",
  },
} as const;

type EntityBadgeProps = {
  icon: string;
  color: string;
  size?: keyof typeof sizeStyles;
  fallback?: "tag" | "wallet";
  className?: string;
  children: React.ReactNode;
};

export function EntityBadge({
  icon,
  color,
  size = "md",
  fallback = "tag",
  className,
  children,
}: EntityBadgeProps) {
  const defaultFallback: LucideIcon = fallback === "wallet" ? Wallet : Tag;
  const Icon = getLucideIcon(icon, defaultFallback);
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center font-medium text-white",
        styles.container,
        className,
      )}
      style={getEntityColorStyle(color, styles.border)}
    >
      {createElement(Icon, {
        className: cn(styles.icon, "shrink-0"),
        "aria-hidden": true,
      })}
      <span className="truncate">{children}</span>
    </span>
  );
}
