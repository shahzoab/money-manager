"use client";

import { useState, useTransition } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { ColorPickerField } from "@/components/ui/color-picker-field";
import { PickerField } from "@/components/ui/picker-field";
import { createAccount, updateAccount, deleteAccount } from "@/actions/accounts";
import { AccountsReorderSheet } from "@/components/accounts/accounts-reorder-sheet";
import { EntityBadge } from "@/components/ui/entity-badge";
import { EntityActionsSheet } from "@/components/ui/entity-actions-sheet";
import { IconPicker } from "@/components/ui/icon-picker";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/lib/currency-format";
import { ACCOUNT_ICON_GROUPS } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const currencyOptions = SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }));

type Account = {
  id: string;
  name: string;
  currency: string;
  color: string;
  icon: string;
  balance: number;
  startingBalance: number;
  isHidden: boolean;
  isDefault: boolean;
  notes: string | null;
};

function createEmptyForm(defaultCurrency: string) {
  return {
    name: "",
    currency: defaultCurrency,
    startingBalance: 0,
    color: "#635BFF",
    icon: "wallet",
    isHidden: false,
    isDefault: false,
    notes: "",
  };
}

export function AccountsManager({
  accounts: initial,
  defaultCurrency = "USD",
}: {
  accounts: Account[];
  defaultCurrency?: string;
}) {
  const [accounts, setAccounts] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();

  const [form, setForm] = useState(() => createEmptyForm(defaultCurrency));

  function resetForm() {
    setForm(createEmptyForm(defaultCurrency));
    setEditing(null);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      currency: account.currency,
      startingBalance: account.startingBalance,
      color: account.color,
      icon: account.icon,
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

  function applyAccountOrder(orderedIds: string[]) {
    const byId = new Map(accounts.map((account) => [account.id, account]));
    setAccounts(orderedIds.flatMap((id) => {
      const account = byId.get(id);
      return account ? [account] : [];
    }));
  }

  function renderAccountCard(account: Account, hidden = false) {
    return (
      <Card
        key={account.id}
        className={cn(
          "border-border/60 bg-surface",
          hidden && "border-dashed border-border/80 opacity-80",
        )}
      >
        <CardContent className="flex gap-2 p-5">
          <div
            className="min-w-0 flex-1 cursor-pointer space-y-2 rounded-lg transition-colors hover:bg-surface-elevated/50 active:bg-surface-elevated"
            role="button"
            tabIndex={0}
            onClick={() => openEdit(account)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openEdit(account);
              }
            }}
          >
            <EntityBadge
              icon={account.icon}
              color={account.color}
              size="field"
              fallback="wallet"
            >
              {account.name}
            </EntityBadge>
            <p className="text-xs text-muted-foreground">{account.currency}</p>
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
          </div>
          <EntityActionsSheet
            entityName={account.name}
            icon={account.icon}
            color={account.color}
            iconFallback="wallet"
            editLabel="Edit account"
            deleteLabel="Delete account"
            onEdit={() => openEdit(account)}
            onDelete={() => setPendingDelete({ id: account.id, name: account.name })}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setReorderOpen(true)}>
          <ArrowUpDown className="h-4 w-4" />
          Reorder
        </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
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
              <div className="space-y-2">
                <Label>Currency</Label>
                <PickerField
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                  options={currencyOptions}
                  placeholder="Select currency"
                  title="Select currency"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPickerField
                  value={form.color}
                  onChange={(color) => setForm({ ...form, color })}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker
                  groups={ACCOUNT_ICON_GROUPS}
                  value={form.icon}
                  onChange={(icon) => setForm({ ...form, icon })}
                  color={form.color}
                  fallback="wallet"
                />
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete Account"
        description={
          pendingDelete
            ? `Delete account "${pendingDelete.name}"? Linked recurring payments will be deactivated.`
            : undefined
        }
        loading={deleting}
        onConfirm={() => {
          if (!pendingDelete) return;
          startDeleteTransition(async () => {
            await deleteAccount(pendingDelete.id);
            setAccounts(accounts.filter((a) => a.id !== pendingDelete.id));
            setPendingDelete(null);
            toast.success("Account deleted");
          });
        }}
      />

      <AccountsReorderSheet
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        accounts={accounts}
        onReordered={applyAccountOrder}
      />
    </>
  );
}
