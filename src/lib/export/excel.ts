import ExcelJS from "exceljs";
import { activeWalletAccountWhere } from "@/lib/accounts";
import { db } from "@/lib/db";

export async function generateExcelExport(userId: string): Promise<Buffer> {
  const [expenses, income, transfers, accounts, settings] = await Promise.all([
    db.transaction.findMany({
      where: { userId, type: "EXPENSE" },
      include: { category: true, fromAccount: true },
      orderBy: { date: "desc" },
    }),
    db.transaction.findMany({
      where: { userId, type: "INCOME" },
      include: { category: true, toAccount: true },
      orderBy: { date: "desc" },
    }),
    db.transaction.findMany({
      where: { userId, type: "TRANSFER" },
      include: { fromAccount: true, toAccount: true },
      orderBy: { date: "desc" },
    }),
    db.walletAccount.findMany({ where: { userId, ...activeWalletAccountWhere } }),
    db.userSettings.findUnique({ where: { userId } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Money Manager";

  const expenseSheet = workbook.addWorksheet("Expenses");
  expenseSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Category", key: "category", width: 20 },
    { header: "Account", key: "account", width: 20 },
    { header: "Comment", key: "comment", width: 30 },
  ];
  for (const tx of expenses) {
    expenseSheet.addRow({
      date: tx.date.toISOString().split("T")[0],
      amount: Number(tx.amount),
      currency: tx.fromAccount?.currency ?? settings?.defaultCurrency ?? "USD",
      category: tx.category?.name ?? "",
      account: tx.fromAccount?.name ?? "",
      comment: tx.comment ?? "",
    });
  }

  const incomeSheet = workbook.addWorksheet("Income");
  incomeSheet.columns = expenseSheet.columns;
  for (const tx of income) {
    incomeSheet.addRow({
      date: tx.date.toISOString().split("T")[0],
      amount: Number(tx.amount),
      currency: tx.toAccount?.currency ?? settings?.defaultCurrency ?? "USD",
      category: tx.category?.name ?? "",
      account: tx.toAccount?.name ?? "",
      comment: tx.comment ?? "",
    });
  }

  const transferSheet = workbook.addWorksheet("Transfers");
  transferSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "From Account", key: "fromAccount", width: 20 },
    { header: "To Account", key: "toAccount", width: 20 },
    { header: "Comment", key: "comment", width: 30 },
  ];
  for (const tx of transfers) {
    transferSheet.addRow({
      date: tx.date.toISOString().split("T")[0],
      amount: Number(tx.amount),
      currency: tx.fromAccount?.currency ?? settings?.defaultCurrency ?? "USD",
      fromAccount: tx.fromAccount?.name ?? "",
      toAccount: tx.toAccount?.name ?? "",
      comment: tx.comment ?? "",
    });
  }

  const accountSheet = workbook.addWorksheet("Accounts");
  accountSheet.columns = [
    { header: "Name", key: "name", width: 20 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Starting Balance", key: "starting", width: 15 },
    { header: "Hidden", key: "hidden", width: 10 },
  ];
  for (const acc of accounts) {
    accountSheet.addRow({
      name: acc.name,
      currency: acc.currency,
      starting: Number(acc.startingBalance),
      hidden: acc.isHidden ? "Yes" : "No",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateBackupJson(userId: string): Promise<string> {
  const [accounts, categories, transactions, tags, recurring, settings] =
    await Promise.all([
      db.walletAccount.findMany({ where: { userId, ...activeWalletAccountWhere } }),
      db.category.findMany({ where: { userId } }),
      db.transaction.findMany({
        where: { userId },
        include: { tags: true },
      }),
      db.tag.findMany({ where: { userId } }),
      db.recurringPayment.findMany({
        where: { userId },
        include: { tags: true },
      }),
      db.userSettings.findUnique({ where: { userId } }),
    ]);

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      tags,
      recurring,
      settings,
    },
    null,
    2,
  );
}
