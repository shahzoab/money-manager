"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { Input } from "@/components/ui/input";
import { PickerField } from "@/components/ui/picker-field";
import { filterFieldClass } from "@/lib/form-field-styles";

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

const sortOptions = [
  { value: "date", label: "Sort by Date" },
  { value: "amount", label: "Sort by Amount" },
];

type Account = {
  id: string;
  name: string;
  currency: string;
  color: string;
  icon: string;
};

export function TransactionFilters({
  accounts,
  period,
}: {
  accounts: Account[];
  period: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Search by comment or category..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          clearTimeout((window as unknown as { _searchTimeout?: ReturnType<typeof setTimeout> })._searchTimeout);
          (window as unknown as { _searchTimeout?: ReturnType<typeof setTimeout> })._searchTimeout = setTimeout(
            () => update("search", v),
            300,
          );
        }}
        className={filterFieldClass}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <AccountFilter
          accounts={accounts}
          selected={searchParams.get("account") ?? undefined}
        />
        <PeriodSelector period={period} />
        <PickerField
          value={searchParams.get("type") ?? "all"}
          onValueChange={(v) => update("type", v === "all" ? "" : v)}
          options={typeOptions}
          placeholder="All types"
          title="Filter by type"
          triggerClassName="w-full sm:w-[140px]"
        />
        <PickerField
          value={searchParams.get("sort") ?? "date"}
          onValueChange={(v) => update("sort", v)}
          options={sortOptions}
          placeholder="Sort by Date"
          title="Sort transactions"
          triggerClassName="w-full sm:w-[140px]"
        />
      </div>
    </div>
  );
}
