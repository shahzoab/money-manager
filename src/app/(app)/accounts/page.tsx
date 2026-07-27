import { getAccounts } from "@/actions/accounts";
import { getSettings } from "@/actions/recurring";
import { getUserAccountBalances } from "@/lib/balance";
import { requireSession } from "@/lib/auth-server";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { AccountsManager } from "@/components/accounts/accounts-manager";

export default async function AccountsPage() {
  const session = await requireSession();
  const [accounts, settings, balances] = await Promise.all([
    getAccounts(),
    getSettings(),
    getUserAccountBalances(session.user.id),
  ]);
  const balanceByAccountId = new Map(
    balances.map((account) => [account.id, account.balance]),
  );
  const accountsWithBalance = accounts.map((account) => ({
    ...account,
    balance: balanceByAccountId.get(account.id) ?? Number(account.startingBalance),
    startingBalance: Number(account.startingBalance),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitleClass}>Accounts</h1>
        <p className={pageSubtitleClass}>
          Manage your wallets, cards, and bank accounts
        </p>
      </div>
      <AccountsManager
        accounts={accountsWithBalance}
        defaultCurrency={settings?.defaultCurrency ?? "USD"}
      />
    </div>
  );
}
