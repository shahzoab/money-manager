"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, updateAccount, deleteAccount } from "@/actions/accounts";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/lib/currency-format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  currency: string;
  color: string;
  balance: number;
  startingBalance: number;
  isHidden: boolean;
  isDefault: boolean;
  notes: string | null;
};

export function AccountsManager({ accounts: initial }: { accounts: Account[] }) {
  const [accounts, setAccounts] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    currency: "USD",
    startingBalance: 0,
    color: "#635BFF",
    icon: "wallet",
    isHidden: false,
    isDefault: false,
    notes: "",
  });

  function resetForm() {
    setForm({
      name: "",
      currency: "USD",
      startingBalance: 0,
      color: "#635BFF",
      icon: "wallet",
      isHidden: false,
      isDefault: false,
      notes: "",
    });
    setEditing(null);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      currency: account.currency,
      startingBalance: account.startingBalance,
      color: account.color,
      icon: "wallet",
      isHidden: account.isHidden,
      isDefault: account.isDefault,
      notes: account.notes ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editing) {
          await updateAccount(editing.id, form);
          toast.success("Account updated");
        } else {
          await createAccount(form);
          toast.success("Account created");
        }
        setOpen(false);
        resetForm();
        window.location.reload();
      } catch {
        toast.error("Failed to save account");
      }
    });
  }

  const visibleAccounts = accounts.filter((a) => !a.isHidden);
  const hiddenAccounts = accounts.filter((a) => a.isHidden);

  function renderAccountCard(account: Account, hidden = false) {
    return (
      <Card
        key={account.id}
        className={cn(
          "border-border/60 bg-surface",
          hidden && "border-dashed border-border/80 opacity-80",
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: account.color }}
              >
                {account.currency.slice(0, 1)}
              </div>
              <div>
                <h3 className="font-semibold">{account.name}</h3>
                <p className="text-xs text-muted-foreground">{account.currency}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400"
                onClick={async () => {
                  await deleteAccount(account.id);
                  setAccounts(accounts.filter((a) => a.id !== account.id));
                  toast.success("Account deleted");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mt-4 text-2xl font-semibold tabular-nums">
            {formatMoney(account.balance, account.currency)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {account.isDefault && (
              <span className="inline-block rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
                Default
              </span>
            )}
            {hidden && (
              <span className="inline-block rounded bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground">
                Hidden
              </span>
            )}
          </div>
          {account.notes && (
            <p className="mt-2 text-xs text-muted-foreground">{account.notes}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Starting Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.startingBalance}
                  onChange={(e) =>
                    setForm({ ...form, startingBalance: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Default account</Label>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Hidden</Label>
                <Switch
                  checked={form.isHidden}
                  onCheckedChange={(v) => setForm({ ...form, isHidden: v })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {editing ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {visibleAccounts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAccounts.map((account) => renderAccountCard(account))}
          </div>
        ) : hiddenAccounts.length > 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No visible accounts</p>
        ) : null}

        {hiddenAccounts.length > 0 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Hidden accounts</h2>
              <p className="text-xs text-muted-foreground">
                Excluded from dashboard totals and account filters
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hiddenAccounts.map((account) => renderAccountCard(account, true))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
