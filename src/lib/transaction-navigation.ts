export function getTransactionsReturnHref(value?: string | string[]): string {
  if (typeof value === "string" && /^\/transactions(?:\?|$)/.test(value)) {
    return value;
  }
  return "/transactions";
}

export function getTransactionHref(
  id: string,
  returnTo = "/transactions",
  edit = false,
): string {
  const path = `/transactions/${encodeURIComponent(id)}${edit ? "/edit" : ""}`;
  const returnHref = getTransactionsReturnHref(returnTo);
  return returnHref === "/transactions"
    ? path
    : `${path}?${new URLSearchParams({ returnTo: returnHref })}`;
}
