import { getRecurringPayments, getUpcomingPayments } from "@/actions/recurring";
import { RecurringManager } from "@/components/recurring/recurring-manager";

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const [payments, upcoming] = await Promise.all([
    getRecurringPayments(params.search),
    getUpcomingPayments(60),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recurring Payments</h1>
        <p className="text-sm text-muted-foreground">
          Manage regular income and expenses
        </p>
      </div>
      <RecurringManager
        payments={payments}
        upcoming={upcoming}
        defaultTab={params.tab ?? "all"}
      />
    </div>
  );
}
