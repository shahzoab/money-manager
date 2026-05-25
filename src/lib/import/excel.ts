import ExcelJS from "exceljs";
import { CategoryType, TransactionType } from "@/generated/prisma/enums";

export type ExcelImportFormat = "android" | "app";

export type ParsedAccount = {
  name: string;
  currency: string;
  startingBalance: number;
  isHidden: boolean;
};

export type ParsedCategory = {
  name: string;
  type: CategoryType;
};

export type ParsedTag = {
  name: string;
};

export type ParsedTransaction = {
  type: TransactionType;
  date: Date;
  amount: number;
  amountInBaseCurrency: number;
  exchangeRate?: number;
  comment?: string;
  categoryName?: string;
  fromAccountName?: string;
  toAccountName?: string;
  tagNames: string[];
};

export type ParsedExcelImport = {
  format: ExcelImportFormat;
  defaultCurrency: string;
  accounts: ParsedAccount[];
  categories: ParsedCategory[];
  tags: ParsedTag[];
  transactions: ParsedTransaction[];
  errors: string[];
};

function cellStr(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: string }).text).trim();
  }
  return String(value).trim();
}

function cellNum(value: ExcelJS.CellValue): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) return value;
  const str = cellStr(value);
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getHeader(sheet: ExcelJS.Worksheet, rowNum: number): Map<string, number> {
  const row = sheet.getRow(rowNum);
  const map = new Map<string, number>();
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    map.set(cellStr(cell.value).toLowerCase(), col);
  });
  return map;
}

function col(header: Map<string, number>, ...names: string[]): number | undefined {
  for (const name of names) {
    const idx = header.get(name.toLowerCase());
    if (idx !== undefined) return idx;
  }
  return undefined;
}

function rowVal(row: ExcelJS.Row, colIdx: number | undefined): ExcelJS.CellValue {
  if (colIdx === undefined) return null;
  return row.getCell(colIdx).value;
}

export function detectExcelFormat(workbook: ExcelJS.Workbook): ExcelImportFormat | null {
  const expenses = workbook.getWorksheet("Expenses");
  if (!expenses) return null;

  const row2 = cellStr(expenses.getRow(2).getCell(1).value);
  if (row2 === "Date and time") return "android";

  const row1 = cellStr(expenses.getRow(1).getCell(1).value);
  if (row1 === "Date") return "app";

  return null;
}

function normalizeName(name: string): string {
  return name.trim();
}

function pickCurrency(counts: Record<string, number>, fallback: string): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return fallback;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function buildAccountsFromTransactions(
  accountCurrencyCounts: Map<string, Record<string, number>>,
  defaultCurrency: string,
): ParsedAccount[] {
  return [...accountCurrencyCounts.keys()]
    .filter(Boolean)
    .sort()
    .map((name) => ({
      name,
      currency: pickCurrency(accountCurrencyCounts.get(name) ?? {}, defaultCurrency),
      startingBalance: 0,
      isHidden: false,
    }));
}

function parseAndroidFormat(workbook: ExcelJS.Workbook): ParsedExcelImport {
  const errors: string[] = [];
  const categories = new Map<string, ParsedCategory>();
  const tags = new Map<string, ParsedTag>();
  const transactions: ParsedTransaction[] = [];
  const accountCurrencyCounts = new Map<string, Record<string, number>>();
  let defaultCurrency = "USD";

  function trackAccountCurrency(name: string, currency: string) {
    const trimmed = normalizeName(name);
    if (!trimmed) return;
    if (!accountCurrencyCounts.has(trimmed)) {
      accountCurrencyCounts.set(trimmed, {});
    }
    const counts = accountCurrencyCounts.get(trimmed)!;
    counts[currency] = (counts[currency] ?? 0) + 1;
  }

  function parseExpenseIncomeSheet(
    sheet: ExcelJS.Worksheet,
    type: "EXPENSE" | "INCOME",
  ) {
    const header = getHeader(sheet, 2);
    const dateCol = col(header, "date and time");
    const categoryCol = col(header, "category");
    const accountCol = col(header, "account");
    const defaultAmountCol = col(header, "amount in default currency");
    const defaultCurrencyCol = col(header, "default currency");
    const accountAmountCol = col(header, "amount in account currency");
    const accountCurrencyCol = col(header, "account currency");
    const txAmountCol = col(header, "transaction amount in transaction currency");
    const txCurrencyCol = col(header, "transaction currency");
    const tagsCol = col(header, "tags");
    const commentCol = col(header, "comment");

    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum <= 2) return;

      const date = parseDate(rowVal(row, dateCol));
      const categoryName = cellStr(rowVal(row, categoryCol));
      const accountName = normalizeName(cellStr(rowVal(row, accountCol)));
      const defCur = cellStr(rowVal(row, defaultCurrencyCol)) || defaultCurrency;
      if (defCur) defaultCurrency = defCur;

      const accountAmount = cellNum(rowVal(row, accountAmountCol));
      const defaultAmount = cellNum(rowVal(row, defaultAmountCol));
      const txAmount = cellNum(rowVal(row, txAmountCol));
      const accountCur =
        cellStr(rowVal(row, accountCurrencyCol)) || defCur || defaultCurrency;

      const amount = accountAmount ?? defaultAmount ?? txAmount;
      if (!date || amount == null) {
        errors.push(`${sheet.name} row ${rowNum}: missing date or amount`);
        return;
      }

      if (categoryName) {
        categories.set(`${type}:${categoryName}`, {
          name: categoryName,
          type: type === "EXPENSE" ? CategoryType.EXPENSE : CategoryType.INCOME,
        });
      }
      trackAccountCurrency(accountName, accountCur);

      const tagStr = cellStr(rowVal(row, tagsCol));
      const tagNames: string[] = [];
      if (tagStr) {
        for (const t of tagStr.split(",")) {
          const trimmed = t.trim();
          if (trimmed) {
            tagNames.push(trimmed);
            tags.set(trimmed, { name: trimmed });
          }
        }
      }

      const amountInBase = defaultAmount ?? amount;
      let exchangeRate: number | undefined;
      if (defaultAmount != null && accountAmount != null && accountAmount !== 0) {
        exchangeRate = defaultAmount / accountAmount;
      }

      transactions.push({
        type: type as TransactionType,
        date,
        amount,
        amountInBaseCurrency: amountInBase,
        exchangeRate,
        comment: cellStr(rowVal(row, commentCol)) || undefined,
        categoryName: categoryName || undefined,
        fromAccountName: type === "EXPENSE" ? accountName : undefined,
        toAccountName: type === "INCOME" ? accountName : undefined,
        tagNames,
      });
    });
  }

  const expenses = workbook.getWorksheet("Expenses");
  const income = workbook.getWorksheet("Income");
  if (!expenses || !income) {
    throw new Error("Missing Expenses or Income sheet");
  }

  parseExpenseIncomeSheet(expenses, "EXPENSE");
  parseExpenseIncomeSheet(income, "INCOME");

  const transfers = workbook.getWorksheet("Transfers");
  if (transfers) {
    const header = getHeader(transfers, 2);
    const dateCol = col(header, "date and time");
    const outgoingCol = col(header, "outgoing");
    const incomingCol = col(header, "incoming");
    const outAmountCol = col(header, "amount in outgoing currency");
    const outCurrencyCol = col(header, "outgoing currency");
    const inAmountCol = col(header, "amount in incoming currency");
    const inCurrencyCol = col(header, "incoming currency");
    const commentCol = col(header, "comment");

    transfers.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum <= 2) return;

      const date = parseDate(rowVal(row, dateCol));
      const fromName = normalizeName(cellStr(rowVal(row, outgoingCol)));
      const toName = normalizeName(cellStr(rowVal(row, incomingCol)));
      const outAmount = cellNum(rowVal(row, outAmountCol));
      const outCur =
        cellStr(rowVal(row, outCurrencyCol)) || defaultCurrency;
      const inCur = cellStr(rowVal(row, inCurrencyCol));

      if (!date || outAmount == null) {
        errors.push(`Transfers row ${rowNum}: missing date or amount`);
        return;
      }

      trackAccountCurrency(fromName, outCur);
      trackAccountCurrency(toName, inCur || defaultCurrency);

      transactions.push({
        type: TransactionType.TRANSFER,
        date,
        amount: outAmount,
        amountInBaseCurrency: outAmount,
        comment: cellStr(rowVal(row, commentCol)) || undefined,
        fromAccountName: fromName || undefined,
        toAccountName: toName || undefined,
        tagNames: [],
      });
    });
  }

  const accounts = buildAccountsFromTransactions(accountCurrencyCounts, defaultCurrency);

  return {
    format: "android",
    defaultCurrency,
    accounts,
    categories: [...categories.values()],
    tags: [...tags.values()],
    transactions,
    errors,
  };
}

function parseAppFormat(workbook: ExcelJS.Workbook): ParsedExcelImport {
  const errors: string[] = [];
  const categories = new Map<string, ParsedCategory>();
  const transactions: ParsedTransaction[] = [];
  const accountMap = new Map<string, ParsedAccount>();
  const currencyCounts: Record<string, number> = {};
  let defaultCurrency = "USD";

  const accountsSheet = workbook.getWorksheet("Accounts");
  if (accountsSheet) {
    const header = getHeader(accountsSheet, 1);
    const nameCol = col(header, "name");
    const currencyCol = col(header, "currency");
    const startingCol = col(header, "starting balance");
    const hiddenCol = col(header, "hidden");

    accountsSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum <= 1) return;
      const name = normalizeName(cellStr(rowVal(row, nameCol)));
      if (!name) return;
      const currency = cellStr(rowVal(row, currencyCol)) || "USD";
      accountMap.set(name, {
        name,
        currency,
        startingBalance: cellNum(rowVal(row, startingCol)) ?? 0,
        isHidden: cellStr(rowVal(row, hiddenCol)).toLowerCase() === "yes",
      });
    });
  }

  function parseTxSheet(
    sheet: ExcelJS.Worksheet,
    type: "EXPENSE" | "INCOME",
  ) {
    const header = getHeader(sheet, 1);
    const dateCol = col(header, "date");
    const amountCol = col(header, "amount");
    const currencyCol = col(header, "currency");
    const categoryCol = col(header, "category");
    const accountCol = col(header, "account");
    const commentCol = col(header, "comment");

    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum <= 1) return;

      const date = parseDate(rowVal(row, dateCol));
      const amount = cellNum(rowVal(row, amountCol));
      const currency = cellStr(rowVal(row, currencyCol)) || defaultCurrency;
      const categoryName = cellStr(rowVal(row, categoryCol));
      const accountName = normalizeName(cellStr(rowVal(row, accountCol)));

      if (currency) {
        currencyCounts[currency] = (currencyCounts[currency] ?? 0) + 1;
      }

      if (!date || amount == null) {
        errors.push(`${sheet.name} row ${rowNum}: missing date or amount`);
        return;
      }

      if (categoryName) {
        categories.set(`${type}:${categoryName}`, {
          name: categoryName,
          type: type === "EXPENSE" ? CategoryType.EXPENSE : CategoryType.INCOME,
        });
      }

      if (accountName && !accountMap.has(accountName)) {
        accountMap.set(accountName, {
          name: accountName,
          currency,
          startingBalance: 0,
          isHidden: false,
        });
      }

      transactions.push({
        type: type as TransactionType,
        date,
        amount,
        amountInBaseCurrency: amount,
        comment: cellStr(rowVal(row, commentCol)) || undefined,
        categoryName: categoryName || undefined,
        fromAccountName: type === "EXPENSE" ? accountName : undefined,
        toAccountName: type === "INCOME" ? accountName : undefined,
        tagNames: [],
      });
    });
  }

  const expenses = workbook.getWorksheet("Expenses");
  const income = workbook.getWorksheet("Income");
  if (!expenses || !income) {
    throw new Error("Missing Expenses or Income sheet");
  }

  parseTxSheet(expenses, "EXPENSE");
  parseTxSheet(income, "INCOME");

  defaultCurrency = pickCurrency(currencyCounts, defaultCurrency);

  const transfers = workbook.getWorksheet("Transfers");
  if (transfers) {
    const header = getHeader(transfers, 1);
    const dateCol = col(header, "date");
    const amountCol = col(header, "amount");
    const currencyCol = col(header, "currency");
    const fromCol = col(header, "from account");
    const toCol = col(header, "to account");
    const commentCol = col(header, "comment");

    transfers.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum <= 1) return;

      const date = parseDate(rowVal(row, dateCol));
      const amount = cellNum(rowVal(row, amountCol));
      const currency = cellStr(rowVal(row, currencyCol)) || defaultCurrency;
      const fromName = normalizeName(cellStr(rowVal(row, fromCol)));
      const toName = normalizeName(cellStr(rowVal(row, toCol)));

      if (!date || amount == null) {
        errors.push(`Transfers row ${rowNum}: missing date or amount`);
        return;
      }

      for (const name of [fromName, toName]) {
        if (name && !accountMap.has(name)) {
          accountMap.set(name, {
            name,
            currency,
            startingBalance: 0,
            isHidden: false,
          });
        }
      }

      transactions.push({
        type: TransactionType.TRANSFER,
        date,
        amount,
        amountInBaseCurrency: amount,
        comment: cellStr(rowVal(row, commentCol)) || undefined,
        fromAccountName: fromName || undefined,
        toAccountName: toName || undefined,
        tagNames: [],
      });
    });
  }

  return {
    format: "app",
    defaultCurrency,
    accounts: [...accountMap.values()],
    categories: [...categories.values()],
    tags: [],
    transactions,
    errors,
  };
}

export async function parseExcelWorkbook(buffer: Buffer): Promise<ParsedExcelImport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const format = detectExcelFormat(workbook);
  if (!format) {
    throw new Error(
      "Unrecognized Excel format. Expected Android Money Manager export or Money Manager app export.",
    );
  }

  return format === "android"
    ? parseAndroidFormat(workbook)
    : parseAppFormat(workbook);
}
