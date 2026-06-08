"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PickerField } from "@/components/ui/picker-field";
import { Input } from "@/components/ui/input";
import { formFieldClass } from "@/lib/form-field-styles";

const periods = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "prev_month", label: "Previous Month" },
  { value: "prev_year", label: "Previous Year" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

export function PeriodSelector({ period }: { period: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function pushParams(params: URLSearchParams) {
    router.push(`?${params.toString()}`);
  }

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    pushParams(params);
  }

  function onDateChange(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    if (value) params.set(key, value);
    else params.delete(key);
    pushParams(params);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <PickerField
        value={period}
        onValueChange={onChange}
        options={periods}
        placeholder="Select period"
        title="Select period"
        triggerClassName="w-full sm:w-[180px]"
      />
      {period === "custom" && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            type="date"
            value={from}
            onChange={(e) => onDateChange("from", e.target.value)}
            className={formFieldClass}
            aria-label="Start date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => onDateChange("to", e.target.value)}
            className={formFieldClass}
            aria-label="End date"
          />
        </div>
      )}
    </div>
  );
}
