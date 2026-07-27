"use client";

import { createElement, useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { CalendarClock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { TransactionType, RecurringFrequency } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { getCommentSuggestions } from "@/actions/transactions";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PickerField } from "@/components/ui/picker-field";
import { Switch } from "@/components/ui/switch";
import { AmountCalculator } from "@/components/transactions/amount-calculator";
import { EntityBadge } from "@/components/ui/entity-badge";
import {
  createRecurringPayment,
  deleteRecurringPayment,
  getTags,
  processDueRecurringPayments,
  updateRecurringPayment,
} from "@/actions/recurring";
import { formatMoney } from "@/lib/currency-format";
import { filterFieldClass } from "@/lib/form-field-styles";
import {
  transactionTypeIcon,
  transactionTypeStyles,
} from "@/lib/transaction-type-styles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const frequencyOptions = Object.values(RecurringFrequency).map((frequency) => ({
  value: frequency,
  label: frequency.charAt(0) + frequency.slice(1).toLowerCase(),
}));

type Account = Awaited<ReturnType<typeof getAccounts>>[number];
type Category = Awaited<ReturnType<typeof getCategories>>[number];
type Tag = Awaited<ReturnType<typeof getTags>>[number];

type Payment = {
  id: string;
  type: TransactionType;
  amount: number;
  frequency: RecurringFrequency;
  nextDueDate: Date;
  autoCreate: boolean;
  comment: string | null;
  categoryId: string | null;
  accountId: string | null;
  category: { name: string; color: string; icon: string } | null;
  account: { name: string; currency: string; color?: string; icon?: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
};

type RecurringTransactionType =
  | (typeof TransactionType)["EXPENSE"]
  | (typeof TransactionType)["INCOME"];

type RecurringForm = {
  type: RecurringTransactionType;
  amount: string;
  frequency: RecurringFrequency;
  dueDate: string;
  dueTime: string;
  accountId: string;
  categoryId: string;
  comment: string;
  tagIds: string[];
  autoCreate: boolean;
};

const formFieldGroupClass = "space-y-2.5";

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function toLocalDateTimeParts(date: Date | string) {
  const value = new Date(date);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  const iso = local.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

function emptyForm(defaultAccountId = ""): RecurringForm {
  const now = toLocalDateTimeParts(new Date());
  return {
    type: TransactionType.EXPENSE,
    amount: "",
    frequency: RecurringFrequency.MONTHLY,
    dueDate: now.date,
    dueTime: now.time,
    accountId: defaultAccountId,
    categoryId: "",
    comment: "",
    tagIds: [],
    autoCreate: true,
  };
}

function paymentToForm(payment: Payment, defaultAccountId = ""): RecurringForm {
  const due = toLocalDateTimeParts(payment.nextDueDate);
  return {
    type:
      payment.type === TransactionType.INCOME
        ? TransactionType.INCOME
        : TransactionType.EXPENSE,
    amount: String(payment.amount),
    frequency: payment.frequency,
    dueDate: due.date,
    dueTime: due.time,
    accountId: payment.accountId ?? defaultAccountId,
    categoryId: payment.categoryId ?? "",
    comment: payment.comment ?? "",
    tagIds: payment.tags.map(({ tag }) => tag.id),
    autoCreate: payment.autoCreate,
  };
}

function buildDueDate(form: RecurringForm) {
  return new Date(`${form.dueDate}T${form.dueTime || "00:00"}`);
}

export function RecurringManager({
  payments,
  upcoming,
  defaultTab,
}: {
  payments: Payment[];
  upcoming: Payment[];
  defaultTab: string;
}) {
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<RecurringForm>(() => emptyForm());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const defaultAccountId = useMemo(() => {
    const defaultAccount = accounts.find((account) => account.isDefault) ?? accounts[0];
    return defaultAccount?.id ?? "";
  }, [accounts]);

  useEffect(() => {
    Promise.all([getAccounts(), getCategories(), getTags()]).then(
      ([loadedAccounts, loadedCategories, loadedTags]) => {
        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setTags(loadedTags);
        const defaultAccount = loadedAccounts.find((account) => account.isDefault) ?? loadedAccounts[0];
        if (defaultAccount) {
          setForm((current) =>
            current.accountId ? current : { ...current, accountId: defaultAccount.id },
          );
        }
      },
    );
  }, []);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        form.type === TransactionType.INCOME
          ? category.type === "INCOME"
          : category.type === "EXPENSE",
      ),
    [categories, form.type],
  );

  const selectedCategoryIsValid = filteredCategories.some(
    (category) => category.id === form.categoryId,
  );
  const selectedCategoryId = selectedCategoryIsValid ? form.categoryId : "";
  const selectedAccount = accounts.find((account) => account.id === form.accountId);
  const typeStyles = transactionTypeStyles(form.type);

  const categoryOptions = filteredCategories.map((category) => ({
    value: category.id,
    label: (
      <EntityBadge icon={category.icon} color={category.color} size="field">
        {category.name}
      </EntityBadge>
    ),
  }));

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: (
      <EntityBadge icon={account.icon} color={account.color} size="field" fallback="wallet">
        {account.name} ({account.currency})
      </EntityBadge>
    ),
  }));

  function openCreateDialog() {
    setEditingPayment(null);
    setForm(emptyForm(defaultAccountId));
    setOpen(true);
  }

  function openEditDialog(payment: Payment) {
    setEditingPayment(payment);
    setForm(paymentToForm(payment, defaultAccountId));
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditingPayment(null);
      setForm(emptyForm(defaultAccountId));
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!form.accountId) {
      toast.error("Select an account");
      return;
    }

    startTransition(async () => {
      try {
        const input = {
          type: form.type,
          amount,
          frequency: form.frequency,
          nextDueDate: buildDueDate(form),
          autoCreate: form.autoCreate,
          accountId: form.accountId,
          categoryId: selectedCategoryId || null,
          comment: form.comment || undefined,
          tagIds: form.tagIds,
        };

        if (editingPayment) {
          await updateRecurringPayment(editingPayment.id, input);
          toast.success("Recurring payment updated");
        } else {
          await createRecurringPayment(input);
          toast.success("Recurring payment created");
        }

        setOpen(false);
        setEditingPayment(null);
        setForm(emptyForm(defaultAccountId));
      } catch {
        toast.error(editingPayment ? "Failed to update" : "Failed to create");
      }
    });
  }

  function toggleTag(tagId: string) {
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((id) => id !== tagId)
        : [...current.tagIds, tagId],
    }));
  }

  const filtered = payments.filter((payment) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      payment.comment?.toLowerCase().includes(query) ||
      payment.category?.name.toLowerCase().includes(query) ||
      payment.account?.name.toLowerCase().includes(query) ||
      payment.tags.some(({ tag }) => tag.name.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground lg:left-3 lg:h-4 lg:w-4" />
          <Input
            placeholder="Search recurring..."
            className={cn(filterFieldClass, "pl-14 lg:pl-10")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await processDueRecurringPayments();
                toast.success(
                  `Processed ${result.processed} due payments (${result.created} added, ${result.notified} notified)`,
                );
              })
            }
          >
            Process Due
          </Button>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add Recurring
          </Button>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPayment ? "Edit Recurring Payment" : "New Recurring Payment"}
                </DialogTitle>
              </DialogHeader>

              <Tabs
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: value as RecurringForm["type"],
                    categoryId: "",
                  }))
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-surface-elevated p-1">
                  <TabsTrigger
                    value={TransactionType.EXPENSE}
                    className={transactionTypeStyles(TransactionType.EXPENSE).tab}
                  >
                    Expense
                  </TabsTrigger>
                  <TabsTrigger
                    value={TransactionType.INCOME}
                    className={transactionTypeStyles(TransactionType.INCOME).tab}
                  >
                    Income
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSave} className="space-y-6">
                <div
                  className={cn(
                    "rounded-2xl border border-border/60 bg-surface-elevated/50 px-4 py-6 text-center ring-1 ring-inset",
                    typeStyles.ring,
                  )}
                >
                  <Label htmlFor="recurring-amount" className="sr-only">
                    Amount
                  </Label>
                  <div className="flex w-full items-center justify-center gap-1">
                    {typeStyles.prefix ? (
                      <span
                        className={cn(
                          "shrink-0 text-3xl font-semibold tabular-nums",
                          typeStyles.amount,
                        )}
                      >
                        {typeStyles.prefix}
                      </span>
                    ) : null}
                    <Input
                      id="recurring-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(event) =>
                        setForm({ ...form, amount: event.target.value })
                      }
                      placeholder="0.00"
                      className={cn(
                        "h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-4xl font-bold tabular-nums shadow-none focus-visible:ring-0 sm:text-5xl",
                        typeStyles.amount,
                      )}
                      required
                    />
                  </div>
                  <div className="mt-3 flex justify-center">
                    <AmountCalculator
                      onResult={(value) =>
                        setForm((current) => ({ ...current, amount: String(value) }))
                      }
                    />
                  </div>
                  {selectedAccount ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Scheduled from {selectedAccount.name} ({selectedAccount.currency})
                    </p>
                  ) : null}
                </div>

                <FormSection title="Details">
                  <div className={formFieldGroupClass}>
                    <Label>Account</Label>
                    <PickerField
                      value={form.accountId}
                      onValueChange={(accountId) => setForm({ ...form, accountId })}
                      options={accountOptions}
                      placeholder="Select account"
                      title="Select account"
                      emptyMessage="No accounts yet - add one in Settings"
                    />
                  </div>

                  <div className={formFieldGroupClass}>
                    <div className="flex items-center justify-between gap-2">
                      <Label>Category</Label>
                      {selectedCategoryId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => setForm({ ...form, categoryId: "" })}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                    <PickerField
                      value={selectedCategoryId}
                      onValueChange={(categoryId) => setForm({ ...form, categoryId })}
                      options={categoryOptions}
                      placeholder="Select category"
                      title="Select category"
                      emptyMessage="No categories yet - add one in Settings"
                    />
                  </div>

                  <div className={formFieldGroupClass}>
                    <Label htmlFor="recurring-comment">Comment</Label>
                    <AutocompleteInput
                      id="recurring-comment"
                      value={form.comment}
                      onChange={(comment) => setForm({ ...form, comment })}
                      onSearch={getCommentSuggestions}
                      placeholder="What is this recurring payment for?"
                    />
                  </div>
                </FormSection>

                <FormSection title="Schedule">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className={formFieldGroupClass}>
                      <Label>Frequency</Label>
                      <PickerField
                        value={form.frequency}
                        onValueChange={(frequency) =>
                          setForm({ ...form, frequency: frequency as RecurringFrequency })
                        }
                        options={frequencyOptions}
                        placeholder="Select frequency"
                        title="Select frequency"
                      />
                    </div>
                    <div className={formFieldGroupClass}>
                      <Label htmlFor="recurring-time">Time</Label>
                      <Input
                        id="recurring-time"
                        type="time"
                        value={form.dueTime}
                        onChange={(event) =>
                          setForm({ ...form, dueTime: event.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className={formFieldGroupClass}>
                    <Label htmlFor="recurring-date">Date</Label>
                    <Input
                      id="recurring-date"
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        setForm({ ...form, dueDate: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-surface-elevated/40 p-4">
                    <div className="min-w-0">
                      <Label htmlFor="recurring-auto-create">
                        Automatically add transaction
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Turn this off to get a due notification without creating a transaction.
                      </p>
                    </div>
                    <Switch
                      id="recurring-auto-create"
                      checked={form.autoCreate}
                      onCheckedChange={(autoCreate) =>
                        setForm({ ...form, autoCreate })
                      }
                    />
                  </div>
                </FormSection>

                {tags.length > 0 ? (
                  <FormSection title="Tags">
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const selected = form.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                              selected
                                ? "border-transparent"
                                : "border-border/70 bg-surface text-muted-foreground hover:text-foreground",
                            )}
                            style={
                              selected
                                ? {
                                    background: `${tag.color}22`,
                                    color: tag.color,
                                  }
                                : undefined
                            }
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </FormSection>
                ) : null}

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending
                    ? "Saving..."
                    : editingPayment
                      ? "Save Changes"
                      : "Create Recurring Payment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {filtered.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onDelete={deleteRecurringPayment}
              onEdit={openEditDialog}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No recurring payments
            </p>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onDelete={deleteRecurringPayment}
              onEdit={openEditDialog}
              upcoming
            />
          ))}
          {upcoming.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing upcoming
            </p>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function PaymentCard({
  payment,
  onDelete,
  onEdit,
  upcoming,
}: {
  payment: Payment;
  onDelete: (id: string) => Promise<void>;
  onEdit: (payment: Payment) => void;
  upcoming?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();
  const currency = payment.account?.currency ?? "USD";
  const label = payment.comment || "Recurring payment";
  const styles = transactionTypeStyles(payment.type);

  return (
    <>
      <Card className="border-border/60 bg-surface">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                  styles.badge,
                )}
              >
                {createElement(transactionTypeIcon(payment.type), {
                  className: "h-3.5 w-3.5",
                })}
                {payment.type.toLowerCase()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {payment.autoCreate ? "Auto-add" : "Notify only"}
              </span>
              {upcoming ? (
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  Upcoming
                </span>
              ) : null}
            </div>

            <p className="truncate font-medium">{label}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{frequencyOptions.find((option) => option.value === payment.frequency)?.label}</span>
              {payment.account ? <span>{payment.account.name}</span> : null}
              {payment.category ? <span>{payment.category.name}</span> : null}
            </div>

            <p className="text-xs text-accent">
              Next: {format(new Date(payment.nextDueDate), "MMM d, yyyy h:mm a")}
            </p>

            {payment.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {payment.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="rounded px-1.5 py-0.5 text-xs"
                    style={{ background: `${tag.color}22`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <p className={cn("font-semibold tabular-nums", styles.amount)}>
              {formatMoney(Number(payment.amount), currency)}
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => onEdit(payment)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-red-400"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove Recurring Payment"
        description={`Remove "${label}"? This recurring payment will be deactivated.`}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={() => {
          startDeleteTransition(async () => {
            await onDelete(payment.id);
            setConfirmOpen(false);
            toast.success("Removed");
            window.location.reload();
          });
        }}
      />
    </>
  );
}
