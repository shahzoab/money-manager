import {
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { TransactionType, CategoryType } from "@/generated/prisma/enums";

export function transactionTypeLabel(type: TransactionType) {
  switch (type) {
    case TransactionType.INCOME:
      return "Income";
    case TransactionType.EXPENSE:
      return "Expense";
    case TransactionType.TRANSFER:
      return "Transfer";
  }
}

export function transactionTypeIcon(type: TransactionType): LucideIcon {
  switch (type) {
    case TransactionType.INCOME:
      return TrendingUp;
    case TransactionType.EXPENSE:
      return TrendingDown;
    case TransactionType.TRANSFER:
      return ArrowLeftRight;
  }
}

export function transactionTypeStyles(type: TransactionType | CategoryType) {
  switch (type) {
    case TransactionType.INCOME:
    case CategoryType.INCOME:
      return {
        badge: "bg-accent-secondary/15 text-accent-secondary",
        tab: "data-[state=active]:bg-accent-secondary/15 data-[state=active]:text-accent-secondary",
        amount: "text-accent-secondary",
        prefix: "+",
        ring: "ring-accent-secondary/30",
      };
    case TransactionType.EXPENSE:
    case CategoryType.EXPENSE:
      return {
        badge: "bg-surface-elevated text-foreground",
        tab: "data-[state=active]:bg-surface-elevated data-[state=active]:text-foreground",
        amount: "text-foreground",
        prefix: "-",
        ring: "ring-border",
      };
    case TransactionType.TRANSFER:
      return {
        badge: "bg-accent/15 text-accent",
        tab: "data-[state=active]:bg-accent/15 data-[state=active]:text-accent",
        amount: "text-accent",
        prefix: "",
        ring: "ring-accent/30",
      };
  }
}
