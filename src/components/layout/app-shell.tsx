"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  Repeat,
  Tags,
  Settings,
  Plus,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { RoundingMode } from "@/generated/prisma/enums";
import { formatAmount } from "@/lib/currency-format";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function isTransactionFormPage(pathname: string) {
  if (pathname === "/transactions/new") return true;
  return /^\/transactions\/[^/]+\/edit$/.test(pathname);
}

function shouldHideFab(pathname: string) {
  if (isTransactionFormPage(pathname)) return true;
  if (/^\/transactions\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function AppShell({
  children,
  totalBalance,
}: {
  children: React.ReactNode;
  totalBalance?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  const hideFab = shouldHideFab(pathname);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          if (!isTransactionFormPage(pathname)) {
            router.push("/transactions/new");
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Money<span className="text-accent">Manager</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavLinks pathname={pathname} />
        </nav>
      </aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight"
              onClick={() => setNavOpen(false)}
            >
              Money<span className="text-accent">Manager</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            <NavLinks pathname={pathname} onNavigate={() => setNavOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="text-base font-bold">
              Money<span className="text-accent">Manager</span>
            </Link>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            {totalBalance !== undefined && (
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="text-xl font-semibold tabular-nums text-accent">
                  {formatAmount(totalBalance, {
                    fractionDigits: 0,
                    roundingMode: RoundingMode.NEAREST,
                  })}
                </p>
              </div>
            )}
            <Button size="sm" className="max-lg:hidden gap-1.5" asChild>
              <Link href="/transactions/new">
                <Plus className="h-4 w-4" />
                Add
              </Link>
            </Button>
          </div>
        </header>

        <main
          className={`min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 lg:pb-6 ${hideFab ? "pb-6" : "pb-44"}`}
        >
          {children}
        </main>
      </div>

      {!hideFab && (
        <MobileBottomBar
          addButton={
            <Button
              size="lg"
              className="h-14 gap-2 rounded-full px-8 shadow-lg"
              aria-label="Add transaction"
              asChild
            >
              <Link href="/transactions/new">
                <Plus className="h-6 w-6" />
                Add
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
