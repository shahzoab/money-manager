import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

export const requireSession = cache(async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
});
