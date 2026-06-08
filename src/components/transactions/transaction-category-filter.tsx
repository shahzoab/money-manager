"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EntityBadge } from "@/components/ui/entity-badge";
import { PickerField } from "@/components/ui/picker-field";
import type { CategoryType } from "@/generated/prisma/client";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
};

export function TransactionCategoryFilter({
  categories,
  selectedType,
}: {
  categories: Category[];
  selectedType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("category") ?? "";

  const filteredCategories = useMemo(() => {
    if (selectedType === "expense") {
      return categories.filter((c) => c.type === "EXPENSE");
    }
    if (selectedType === "income") {
      return categories.filter((c) => c.type === "INCOME");
    }
    return categories;
  }, [categories, selectedType]);

  const options = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...filteredCategories.map((c) => ({
        value: c.id,
        label: (
          <EntityBadge icon={c.icon} color={c.color} size="field">
            {c.name}
          </EntityBadge>
        ),
      })),
    ],
    [filteredCategories],
  );

  useEffect(() => {
    if (!selected || selected === "all") return;
    const isValid = filteredCategories.some((c) => c.id === selected);
    if (!isValid) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      router.replace(`?${params.toString()}`);
    }
  }, [filteredCategories, selected, searchParams, router]);

  if (selectedType === "transfer") {
    return null;
  }

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("category");
    else params.set("category", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <PickerField
      value={selected || "all"}
      onValueChange={onChange}
      options={options}
      placeholder="All categories"
      title="Filter by category"
      triggerClassName="w-full sm:w-[180px]"
    />
  );
}
