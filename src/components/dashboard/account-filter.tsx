"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EntityBadge } from "@/components/ui/entity-badge";
import { PickerField } from "@/components/ui/picker-field";

type Account = {
  id: string;
  name: string;
  currency: string;
  color: string;
  icon: string;
};

export function AccountFilter({
  accounts,
  selected,
}: {
  accounts: Account[];
  selected?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const options = useMemo(
    () => [
      { value: "all", label: "All accounts" },
      ...accounts.map((a) => ({
        value: a.id,
        label: (
          <EntityBadge icon={a.icon} color={a.color} size="field" fallback="wallet">
            {a.name}
          </EntityBadge>
        ),
      })),
    ],
    [accounts],
  );

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("account");
    } else {
      params.set("account", value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <PickerField
      value={selected ?? "all"}
      onValueChange={onChange}
      options={options}
      placeholder="All accounts"
      title="Select account"
      triggerClassName="w-full sm:w-[160px]"
    />
  );
}
