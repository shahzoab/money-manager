import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";

export type Period = "day" | "week" | "month" | "year" | "custom";

export function getPeriodRange(
  period: Period,
  customFrom?: Date,
  customTo?: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): { from: Date; to: Date } {
  const now = new Date();

  switch (period) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return {
        from: startOfWeek(now, { weekStartsOn }),
        to: endOfWeek(now, { weekStartsOn }),
      };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":
      return {
        from: customFrom ?? subDays(now, 30),
        to: customTo ?? now,
      };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function getPeriodLabel(period: Period): string {
  const labels: Record<Period, string> = {
    day: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    custom: "Custom",
  };
  return labels[period];
}
