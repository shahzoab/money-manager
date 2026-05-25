"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import { TransactionType, RecurringFrequency } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRecurringPayment,
  deleteRecurringPayment,
  processDueRecurringPayments,
} from "@/actions/recurring";
import { formatMoney } from "@/lib/currency-format";
import { toast } from "sonner";

type Payment = {
  id: string;
  type: TransactionType;
  amount: unknown;
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
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recurring..."
            className="pl-9"
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
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as TransactionType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                      <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Select
                    value={form.frequency}
                    onValueChange={(v) => setForm({ ...form, frequency: v as RecurringFrequency })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(RecurringFrequency).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
  const currency = payment.account?.currency ?? "USD";
  return (
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
            <span className="text-[10px] text-muted-foreground">Auto-create</span>
          )}
          {upcoming && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-red-400"
              onClick={async () => {
                await onDelete(payment.id);
                toast.success("Removed");
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
