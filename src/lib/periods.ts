import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export type Period =
  | "day"
  | "week"
  | "month"
  | "year"
  | "prev_month"
  | "prev_year"
  | "all"
  | "custom";

export type PeriodRange = {
  from?: Date;
  to?: Date;
};

export function getPeriodRange(
  period: Period,
  customFrom?: Date,
  customTo?: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): PeriodRange {
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
    case "prev_month": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "prev_year": {
      const prev = subYears(now, 1);
      return { from: startOfYear(prev), to: endOfYear(prev) };
    }
    case "all":
      return {};
    case "custom":
      return {
        from: startOfDay(customFrom ?? subDays(now, 30)),
        to: endOfDay(customTo ?? now),
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
    prev_month: "Previous Month",
    prev_year: "Previous Year",
    all: "All Time",
    custom: "Custom Range",
  };
  return labels[period];
}

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function parsePeriodParams(
  searchParams: { period?: string; from?: string; to?: string },
  settings?: { homePeriod?: string | null; firstDayOfWeek?: number | null } | null,
): { period: Period; from?: Date; to?: Date } {
  const period = (searchParams.period ?? settings?.homePeriod ?? "month") as Period;
  const customFrom = parseDateParam(searchParams.from);
  const customTo = parseDateParam(searchParams.to);
  const weekStartsOn = (settings?.firstDayOfWeek ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  if (period === "custom") {
    const range = getPeriodRange("custom", customFrom, customTo, weekStartsOn);
    return { period, from: range.from, to: range.to };
  }

  const range = getPeriodRange(period, undefined, undefined, weekStartsOn);
  return { period, from: range.from, to: range.to };
}

export function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return {};
  return {
    date: {
      ...(from && { gte: from }),
      ...(to && { lte: to }),
    },
  };
}
