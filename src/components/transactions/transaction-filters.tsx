"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
        className="min-w-0 flex-1"
      />
      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => update("type", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("sort") ?? "date"}
        onValueChange={(v) => update("sort", v)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Sort by Date</SelectItem>
          <SelectItem value="amount">Sort by Amount</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
