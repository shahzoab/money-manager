export const translations = {
  en: {
    appName: "Money Manager",
    dashboard: "Dashboard",
    transactions: "Transactions",
    accounts: "Accounts",
    charts: "Charts",
    recurring: "Recurring",
    categories: "Categories",
    settings: "Settings",
    addTransaction: "Add Transaction",
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    balance: "Balance",
    totalBalance: "Total Balance",
    netFlow: "Net Flow",
    search: "Search transactions...",
    export: "Export",
    backup: "Backup",
    restore: "Restore",
    signOut: "Sign Out",
    login: "Sign In",
    register: "Create Account",
  },
} as const;

export type Locale = keyof typeof translations;

export function t(key: keyof (typeof translations)["en"], locale: Locale = "en") {
  return translations[locale][key] ?? translations.en[key];
}
