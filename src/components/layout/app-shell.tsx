"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { SyncStatusIndicator } from "@/components/layout/sync-status";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
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

      <div className="flex flex-1 flex-col">
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
            <SyncStatusIndicator />
            <AddTransactionDialog
              trigger={
                <Button size="sm" className="max-lg:hidden gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              }
              mobileTrigger={
                <Button
                  size="icon"
                  className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg lg:hidden"
                  aria-label="Add transaction"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              }
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
