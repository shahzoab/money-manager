"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Account = {
  id: string;
  name: string;
  currency: string;
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
    <Select value={selected ?? "all"} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
