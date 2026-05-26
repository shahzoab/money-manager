"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import { TransactionType, RecurringFrequency } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PickerField } from "@/components/ui/picker-field";
import {
  createRecurringPayment,
  deleteRecurringPayment,
  processDueRecurringPayments,
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
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    type: TransactionType.EXPENSE as TransactionType,
    amount: "",
    frequency: RecurringFrequency.MONTHLY as RecurringFrequency,
    nextDueDate: new Date().toISOString().split("T")[0],
    autoCreate: false,
    comment: "",
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createRecurringPayment({
          type: form.type,
          amount: parseFloat(form.amount),
          frequency: form.frequency,
          nextDueDate: new Date(form.nextDueDate),
          autoCreate: form.autoCreate,
          comment: form.comment || undefined,
        });
        toast.success("Recurring payment created");
        setOpen(false);
        window.location.reload();
      } catch {
        toast.error("Failed to create");
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
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground lg:left-3 lg:h-4 lg:w-4" />
          <Input
            placeholder="Search recurring..."
            className={cn("pl-12 lg:pl-9", filterFieldClass)}
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Recurring
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Recurring Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
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
                  <Label>Next Due Date</Label>
                  <Input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comment</Label>
                  <Input
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-create transaction</Label>
                  <Switch
                    checked={form.autoCreate}
                    onCheckedChange={(v) => setForm({ ...form, autoCreate: v })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  Create
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
            <PaymentCard key={p.id} payment={p} onDelete={deleteRecurringPayment} />
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No recurring payments</p>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.map((p) => (
            <PaymentCard key={p.id} payment={p} onDelete={deleteRecurringPayment} upcoming />
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
  upcoming,
}: {
  payment: Payment;
  onDelete: (id: string) => Promise<void>;
  upcoming?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();
  const currency = payment.account?.currency ?? "USD";
  const label = payment.comment || "Recurring payment";

  return (
    <>
    <Card className="border-border/60 bg-surface">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{payment.comment || "Recurring payment"}</p>
          <p className="text-xs text-muted-foreground">
            {payment.frequency} · {payment.type}
            {payment.category && ` · ${payment.category.name}`}
          </p>
          <p className="mt-1 text-xs text-accent">
            Next: {format(new Date(payment.nextDueDate), "MMM d, yyyy")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">
            {formatMoney(Number(payment.amount), currency)}
          </p>
          {payment.autoCreate && (
            <span className="text-xs text-muted-foreground">Auto-create</span>
          )}
          {upcoming && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-red-400"
              onClick={() => setConfirmOpen(true)}
            >
              Remove
            </Button>
          )}
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
