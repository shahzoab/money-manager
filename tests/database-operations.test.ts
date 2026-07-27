import assert from "node:assert/strict";
import test from "node:test";
import { TransactionType } from "../src/generated/prisma/client";
import {
  computeAccountBalancesFromTransactions,
} from "../src/lib/balance-calculation";
import { userCacheTag } from "../src/lib/cache-tags";
import { summarizeTransactions } from "../src/lib/dashboard-aggregation";
import { DATABASE_OPERATION_BUDGET } from "../src/lib/operation-budget";
import { filterUpcomingPayments } from "../src/lib/recurring-utils";
import { isRegistrationEnabled } from "../src/lib/registration";
import { serializeTransaction } from "../src/lib/serialize";

test("computes all account balances from one shared transaction snapshot", () => {
  const balances = computeAccountBalancesFromTransactions(
    [
      { id: "cash", startingBalance: 100 },
      { id: "bank", startingBalance: 500 },
    ],
    [
      {
        type: TransactionType.EXPENSE,
        amount: 20,
        fromAccountId: "cash",
        toAccountId: null,
      },
      {
        type: TransactionType.INCOME,
        amount: 50,
        fromAccountId: null,
        toAccountId: "bank",
      },
      {
        type: TransactionType.TRANSFER,
        amount: 30,
        toAmount: 32,
        fromAccountId: "bank",
        toAccountId: "cash",
      },
    ],
  );

  assert.equal(balances.get("cash"), 112);
  assert.equal(balances.get("bank"), 520);
});

test("builds dashboard totals from the shared period snapshot", () => {
  assert.deepEqual(
    summarizeTransactions([
      { type: TransactionType.INCOME, amountInBaseCurrency: 1000 },
      { type: TransactionType.EXPENSE, amountInBaseCurrency: 250 },
      { type: TransactionType.EXPENSE, amountInBaseCurrency: 75 },
      { type: TransactionType.TRANSFER, amountInBaseCurrency: 40 },
    ]),
    {
      income: 1000,
      expenses: 325,
      transfers: 40,
      net: 675,
    },
  );
});

test("derives upcoming recurring payments without another database read", () => {
  const until = new Date("2026-08-01T00:00:00.000Z");
  const payments = [
    { id: "due", nextDueDate: "2026-07-31T00:00:00.000Z" },
    { id: "later", nextDueDate: new Date("2026-08-02T00:00:00.000Z") },
  ];

  assert.deepEqual(
    filterUpcomingPayments(payments, until).map((payment) => payment.id),
    ["due"],
  );
});

test("serializes transaction dates consistently for cached and uncached reads", () => {
  const serialized = serializeTransaction({
    amount: 25,
    toAmount: null,
    amountInBaseCurrency: 25,
    exchangeRate: 1,
    date: new Date("2026-07-28T12:00:00.000Z"),
    createdAt: new Date("2026-07-28T12:01:00.000Z"),
    updatedAt: "2026-07-28T12:02:00.000Z",
  });

  assert.equal(serialized.date, "2026-07-28T12:00:00.000Z");
  assert.equal(serialized.createdAt, "2026-07-28T12:01:00.000Z");
  assert.equal(serialized.updatedAt, "2026-07-28T12:02:00.000Z");
});

test("cache tags are isolated by user and data area", () => {
  assert.notEqual(
    userCacheTag("user-a", "transactions"),
    userCacheTag("user-b", "transactions"),
  );
  assert.notEqual(
    userCacheTag("user-a", "transactions"),
    userCacheTag("user-a", "settings"),
  );
});

test("operation ceilings preserve the planned monthly headroom", () => {
  assert.equal(DATABASE_OPERATION_BUDGET.hourlyCronMaximumPer31DayMonth, 744);
  assert.ok(
    DATABASE_OPERATION_BUDGET.investigationThreshold <=
      DATABASE_OPERATION_BUDGET.monthlyLimit - 20_000,
  );
  assert.ok(DATABASE_OPERATION_BUDGET.coldProtectedPageMaximum <= 8);
  assert.ok(DATABASE_OPERATION_BUDGET.warmProtectedPageMaximum <= 2);
});

test("registration environment switch is enforced", () => {
  const original = process.env.REGISTRATION_ENABLED;
  process.env.REGISTRATION_ENABLED = "false";
  assert.equal(isRegistrationEnabled(), false);
  process.env.REGISTRATION_ENABLED = "true";
  assert.equal(isRegistrationEnabled(), true);

  if (original === undefined) {
    delete process.env.REGISTRATION_ENABLED;
  } else {
    process.env.REGISTRATION_ENABLED = original;
  }
});
