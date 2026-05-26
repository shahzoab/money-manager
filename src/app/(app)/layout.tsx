import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { initializeUserData } from "@/actions/user";
import { AppShell } from "@/components/layout/app-shell";
import { AppLockProvider } from "@/components/security/app-lock";
import { getSettings } from "@/actions/recurring";
import { getDashboardData } from "@/actions/dashboard";
import { OfflineSync } from "@/components/offline/offline-sync";
import { getAccountBalance } from "@/lib/balance";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  await initializeUserData();
  const settings = await getSettings();
  const dashData = await getDashboardData();

  const accountsWithBalance = await Promise.all(
    dashData.accounts.map(async (a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      color: a.color,
      icon: a.icon,
      balance: await getAccountBalance(a.id),
    })),
  );

  return (
    <AppLockProvider
      enabled={settings?.appLockEnabled ?? false}
      pinHash={settings?.appLockHash ?? null}
    >
      <OfflineSync
        userId={session.user.id}
        accounts={accountsWithBalance}
        transactions={dashData.transactions.map((t) => ({
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
      <AppShell totalBalance={dashData.totalBalance}>
        {children}
      </AppShell>
    </AppLockProvider>
  );
}
