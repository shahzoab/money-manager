import assert from "node:assert/strict";
import test from "node:test";
import {
  getAddTransactionHref,
  getTransactionHref,
  getTransactionsReturnHref,
} from "../src/lib/transaction-navigation";

test("adding a transaction carries the full filtered list URL through its details", () => {
  const filters = new URLSearchParams({
    account: "bank",
    category: "food",
    type: "expense",
    period: "custom",
    from: "2026-10-01",
    to: "2026-10-30",
    search: "Lunch & coffee",
    sort: "amount",
    page: "2",
    perPage: "25",
  });
  const returnTo = `/transactions?${filters}`;
  const addUrl = new URL(getAddTransactionHref("/transactions", filters), "http://localhost");
  assert.equal(addUrl.searchParams.get("account"), "bank");
  assert.equal(addUrl.searchParams.get("category"), "food");
  assert.equal(addUrl.searchParams.get("type"), "expense");
  assert.equal(addUrl.searchParams.get("returnTo"), returnTo);

  const detailUrl = new URL(
    getTransactionHref("new-id", getTransactionsReturnHref(addUrl.searchParams.get("returnTo")!)),
    "http://localhost",
  );
  assert.equal(detailUrl.pathname, "/transactions/new-id");
  assert.equal(getTransactionsReturnHref(detailUrl.searchParams.get("returnTo")!), returnTo);
});

test("unfiltered and other pages keep the default Add destination", () => {
  assert.equal(getAddTransactionHref("/transactions", new URLSearchParams()), "/transactions/new");
  assert.equal(getAddTransactionHref("/dashboard", new URLSearchParams("account=bank")), "/transactions/new");
});

test("return destinations are restricted to the transactions list", () => {
  for (const value of ["https://example.com", "//example.com", "/transactions/new", "/transactions/123"]) {
    assert.equal(getTransactionsReturnHref(value), "/transactions");
    assert.equal(getTransactionHref("new-id", value), "/transactions/new-id");
  }
});
