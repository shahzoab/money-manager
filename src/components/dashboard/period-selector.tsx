"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PickerField } from "@/components/ui/picker-field";

const periods = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export function PeriodSelector({ period }: { period: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <PickerField
      value={period}
      onValueChange={onChange}
      options={periods}
      placeholder="Select period"
      title="Select period"
      triggerClassName="w-full sm:w-[140px]"
    />
  );
}
