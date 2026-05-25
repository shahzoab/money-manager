"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Money<span className="text-accent">Manager</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
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
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/dashboard" className="text-base font-bold">
              Money<span className="text-accent">Manager</span>
            </Link>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <SyncStatusIndicator />
            <AddTransactionDialog
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              }
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface lg:hidden">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                active ? "text-accent" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
