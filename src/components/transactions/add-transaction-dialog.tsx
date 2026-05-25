"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TransactionType } from "@/generated/prisma/enums";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTransaction, getCommentSuggestions } from "@/actions/transactions";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { AmountCalculator } from "@/components/transactions/amount-calculator";
import { toast } from "sonner";

type AddTransactionDialogProps = {
  trigger: React.ReactNode;
  defaultType?: TransactionType;
};

export function AddTransactionDialog({ trigger, defaultType }: AddTransactionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(defaultType ?? TransactionType.EXPENSE);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof getAccounts>>>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
        setAccounts(accs);
        setCategories(cats);
        const defaultAcc = accs.find((a) => a.isDefault) ?? accs[0];
        if (defaultAcc) {
          setFromAccountId(defaultAcc.id);
          setToAccountId(defaultAcc.id);
        }
      });
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredCategories = categories.filter((c) =>
    type === TransactionType.INCOME ? c.type === "INCOME" : c.type === "EXPENSE",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    startTransition(async () => {
      try {
        await createTransaction({
          type,
          amount: numAmount,
          date: new Date(date),
          comment: comment || undefined,
          photoUrl: photoUrl || undefined,
          categoryId: categoryId || undefined,
          fromAccountId:
            type === TransactionType.EXPENSE || type === TransactionType.TRANSFER
              ? fromAccountId
              : undefined,
          toAccountId:
            type === TransactionType.INCOME || type === TransactionType.TRANSFER
              ? toAccountId
              : undefined,
        });
        router.refresh();
        toast.success("Transaction added");
        setOpen(false);
        setAmount("");
        setComment("");
        setPhotoUrl("");
      } catch {
        toast.error("Failed to add transaction");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>

        <Tabs
          value={type}
          onValueChange={(v) => setType(v as TransactionType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value={TransactionType.EXPENSE}>Expense</TabsTrigger>
            <TabsTrigger value={TransactionType.INCOME}>Income</TabsTrigger>
            <TabsTrigger value={TransactionType.TRANSFER}>Transfer</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg tabular-nums"
                required
              />
              <AmountCalculator onResult={(v) => setAmount(String(v))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {type !== TransactionType.TRANSFER && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === TransactionType.EXPENSE || type === TransactionType.TRANSFER) && (
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === TransactionType.INCOME || type === TransactionType.TRANSFER) && (
            <div className="space-y-2">
              <Label>{type === TransactionType.TRANSFER ? "To Account" : "Account"}</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Comment</Label>
            <Input
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                getCommentSuggestions(e.target.value).then(setSuggestions);
              }}
              placeholder="Optional note"
              list="comment-suggestions"
            />
            {suggestions.length > 0 && (
              <datalist id="comment-suggestions">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-2">
            <Label>Receipt photo (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") setPhotoUrl(reader.result);
                };
                reader.readAsDataURL(file);
              }}
            />
            {photoUrl && (
              <p className="text-xs text-accent-secondary">Photo attached</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
