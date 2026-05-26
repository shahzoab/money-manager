import { getAccounts } from "@/actions/accounts";
import { getSettings } from "@/actions/recurring";
import { getAccountBalance } from "@/lib/balance";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { AccountsManager } from "@/components/accounts/accounts-manager";

export default async function AccountsPage() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);

  const accountsWithBalance = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balance: await getAccountBalance(account.id),
      startingBalance: Number(account.startingBalance),
    })),
  );

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
