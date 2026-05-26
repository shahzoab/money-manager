import { getRecurringPayments, getUpcomingPayments } from "@/actions/recurring";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
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
        <h1 className={pageTitleClass}>Recurring Payments</h1>
        <p className={pageSubtitleClass}>
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
