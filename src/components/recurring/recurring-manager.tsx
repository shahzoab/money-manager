"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TransactionType, RecurringFrequency } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import {
  createRecurringPayment,
  deleteRecurringPayment,
  processDueRecurringPayments,
  updateRecurringPayment,
} from "@/actions/recurring";
import { formatMoney } from "@/lib/currency-format";
import { filterFieldClass } from "@/lib/form-field-styles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const recurringTypeOptions = [
  { value: TransactionType.EXPENSE, label: "Expense" },
  { value: TransactionType.INCOME, label: "Income" },
];

const frequencyOptions = Object.values(RecurringFrequency).map((f) => ({
  value: f,
  label: f,
}));

type Payment = {
  id: string;
  type: TransactionType;
  amount: number;
  frequency: RecurringFrequency;
  nextDueDate: Date;
  autoCreate: boolean;
  comment: string | null;
  category: { name: string; color: string } | null;
  account: { name: string; currency: string } | null;
};

type RecurringForm = {
  type: TransactionType;
  amount: string;
  frequency: RecurringFrequency;
  nextDueDate: string;
  comment: string;
};

function toDateTimeLocalValue(date: Date | string) {
  const value = new Date(date);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyForm(): RecurringForm {
  return {
    type: TransactionType.EXPENSE,
    amount: "",
    frequency: RecurringFrequency.MONTHLY,
    nextDueDate: toDateTimeLocalValue(new Date()),
    comment: "",
  };
}

function paymentToForm(payment: Payment): RecurringForm {
  return {
    type: payment.type,
    amount: String(payment.amount),
    frequency: payment.frequency,
    nextDueDate: toDateTimeLocalValue(payment.nextDueDate),
    comment: payment.comment ?? "",
  };
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<RecurringForm>(() => emptyForm());

  function openCreateDialog() {
    setEditingPayment(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEditDialog(payment: Payment) {
    setEditingPayment(payment);
    setForm(paymentToForm(payment));
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditingPayment(null);
      setForm(emptyForm());
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const input = {
          type: form.type,
          amount: parseFloat(form.amount),
          frequency: form.frequency,
          nextDueDate: new Date(form.nextDueDate),
          autoCreate: true,
          comment: form.comment || undefined,
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
        setForm(emptyForm());
        router.refresh();
      } catch {
        toast.error(editingPayment ? "Failed to update" : "Failed to create");
      }
    });
  }

  const filtered = payments.filter((p) =>
    !search || p.comment?.toLowerCase().includes(search.toLowerCase()),
  );

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
            onClick={() =>
              startTransition(async () => {
                const count = await processDueRecurringPayments();
                toast.success(`Processed ${count} due payments`);
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPayment ? "Edit Recurring Payment" : "New Recurring Payment"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <PickerField
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as TransactionType })}
                    options={recurringTypeOptions}
                    placeholder="Select type"
                    title="Select type"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <PickerField
                    value={form.frequency}
                    onValueChange={(v) => setForm({ ...form, frequency: v as RecurringFrequency })}
                    options={frequencyOptions}
                    placeholder="Select frequency"
                    title="Select frequency"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Due</Label>
                  <Input
                    type="datetime-local"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comment</Label>
                  <AutocompleteInput
                    value={form.comment}
                    onChange={(comment) => setForm({ ...form, comment })}
                    onSearch={getCommentSuggestions}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {editingPayment ? "Save Changes" : "Create"}
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
          {filtered.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              onDelete={deleteRecurringPayment}
              onEdit={openEditDialog}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No recurring payments</p>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              onDelete={deleteRecurringPayment}
              onEdit={openEditDialog}
              upcoming
            />
          ))}
          {upcoming.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing upcoming</p>
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

  return (
    <>
      <Card className="border-border/60 bg-surface">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{payment.comment || "Recurring payment"}</p>
            <p className="text-xs text-muted-foreground">
              {payment.frequency} · {payment.type}
              {payment.category && ` · ${payment.category.name}`}
              {upcoming && " · Upcoming"}
            </p>
            <p className="mt-1 text-xs text-accent">
              Next: {format(new Date(payment.nextDueDate), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 text-right">
            <p className="font-semibold tabular-nums">
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
