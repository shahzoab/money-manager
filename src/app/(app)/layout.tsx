import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { AppShell } from "@/components/layout/app-shell";
import { AppLockProvider } from "@/components/security/app-lock";
import { getSettings } from "@/actions/recurring";
import { getDashboardData } from "@/actions/dashboard";
import { getCategories } from "@/actions/categories";
import { getCommentSuggestions } from "@/actions/transactions";
import { OfflineQueueSync } from "@/components/offline/offline-queue-sync";
import { OfflineSync } from "@/components/offline/offline-sync";
import { getUserAccountBalances } from "@/lib/balance";

type AppBootstrapData = {
  settings: Awaited<ReturnType<typeof getSettings>>;
  dashboard: Awaited<ReturnType<typeof getDashboardData>>;
  categories: Awaited<ReturnType<typeof getCategories>>;
  comments: Awaited<ReturnType<typeof getCommentSuggestions>>;
  accountBalances: Awaited<ReturnType<typeof getUserAccountBalances>>;
};

async function loadAppBootstrapData(userId: string): Promise<AppBootstrapData> {
  const [settings, dashboard, categories, comments, accountBalances] =
    await Promise.all([
      getSettings(),
      getDashboardData(),
      getCategories(),
      getCommentSuggestions(),
      getUserAccountBalances(userId),
    ]);

  return { settings, dashboard, categories, comments, accountBalances };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const {
    settings,
    dashboard,
    categories,
    comments,
    accountBalances,
  } = await loadAppBootstrapData(session.user.id);
  const visibleAccountIds = new Set(
    dashboard.accounts.map((account) => account.id),
  );
  const accountsWithBalance = accountBalances
    .filter((account) => visibleAccountIds.has(account.id))
    .map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      balance: account.balance,
      isDefault: account.isDefault,
      sortOrder: account.sortOrder,
      isHidden: account.isHidden,
    }));

  return (
    <AppLockProvider
      enabled={settings?.appLockEnabled ?? false}
      pinHash={settings?.appLockHash ?? null}
    >
      <OfflineSync
        userId={session.user.id}
        accounts={accountsWithBalance}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          sortOrder: c.sortOrder,
        }))}
        comments={comments}
        transactions={dashboard.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          date: t.date.toISOString(),
          comment: t.comment,
          categoryId: t.categoryId,
          fromAccountId: t.fromAccountId,
          toAccountId: t.toAccountId,
        }))}
      />
      <OfflineQueueSync />
      <AppShell totalBalance={dashboard.totalBalance}>
        {children}
      </AppShell>
    </AppLockProvider>
  );
}
