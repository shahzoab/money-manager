export function getAddTransactionHref(
  pathname: string,
  searchParams: { get(name: string): string | null; toString(): string },
): string {
  const params = new URLSearchParams();
  if (pathname === "/transactions") {
    for (const key of ["type", "account", "category"]) {
      const value = searchParams.get(key);
      if (value && value !== "all") params.set(key, value);
    }
    const query = searchParams.toString();
    if (query) params.set("returnTo", `/transactions?${query}`);
  }
  const query = params.toString();
  return `/transactions/new${query ? `?${query}` : ""}`;
}

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
