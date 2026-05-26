"use client";

import { Tag, Wallet, type LucideIcon } from "lucide-react";
import { getLucideIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: { container: "h-6 w-6 rounded-md", icon: "h-3 w-3", border: "1px solid" },
  md: { container: "h-8 w-8 rounded-lg", icon: "h-4 w-4", border: "2px solid" },
  lg: { container: "h-10 w-10 rounded-lg", icon: "h-5 w-5", border: "2px solid" },
  xl: { container: "h-12 w-12 rounded-lg", icon: "h-6 w-6", border: "2px solid" },
} as const;

type EntityIconProps = {
  icon: string;
  color: string;
  size?: keyof typeof sizeStyles;
  fallback?: "tag" | "wallet";
  className?: string;
};

export function EntityIcon({
  icon,
  color,
  size = "md",
  fallback = "tag",
  className,
}: EntityIconProps) {
  const defaultFallback: LucideIcon = fallback === "wallet" ? Wallet : Tag;
  const Icon = getLucideIcon(icon, defaultFallback);
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        styles.container,
        className,
      )}
      style={{
        background: `${color}33`,
        border: `${styles.border} ${color}`,
      }}
    >
      <Icon className={styles.icon} style={{ color }} aria-hidden />
    </div>
  );
}
