"use client";

import { AccountFilter } from "@/components/dashboard/account-filter";
import { PeriodSelector } from "@/components/dashboard/period-selector";

type Account = {
  id: string;
  name: string;
  currency: string;
  color: string;
  icon: string;
};

export function ChartsFilters({
  accounts,
  period,
  selectedAccount,
}: {
  accounts: Account[];
  period: string;
  selectedAccount?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <AccountFilter accounts={accounts} selected={selectedAccount} />
      <PeriodSelector period={period} />
    </div>
  );
}
