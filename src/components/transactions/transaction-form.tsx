"use client";

import { useEffect, useRef, useState } from "react";
import { TransactionType } from "@/generated/prisma/enums";
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
import { getCommentSuggestions } from "@/actions/transactions";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { AmountCalculator } from "@/components/transactions/amount-calculator";
import { toast } from "sonner";

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  date: string;
  categoryId: string;
  fromAccountId: string;
  toAccountId: string;
  comment: string;
  photoUrl: string;
};

export type TransactionFormSubmitData = {
  type: TransactionType;
  amount: number;
  date: Date;
  comment?: string;
  photoUrl?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
};

type TransactionFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<TransactionFormValues>;
  submitLabel: string;
  pending: boolean;
  autoFocusAmount?: boolean;
  onSubmit: (data: TransactionFormSubmitData) => void;
};

const emptyValues: TransactionFormValues = {
  type: TransactionType.EXPENSE,
  amount: "",
  date: new Date().toISOString().split("T")[0],
  categoryId: "",
  fromAccountId: "",
  toAccountId: "",
  comment: "",
  photoUrl: "",
};

export function TransactionForm({
  mode,
  initialValues,
  submitLabel,
  pending,
  autoFocusAmount,
  onSubmit,
}: TransactionFormProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<TransactionType>(
    initialValues?.type ?? emptyValues.type,
  );
  const [amount, setAmount] = useState(initialValues?.amount ?? emptyValues.amount);
  const [comment, setComment] = useState(initialValues?.comment ?? emptyValues.comment);
  const [date, setDate] = useState(initialValues?.date ?? emptyValues.date);
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId ?? emptyValues.categoryId,
  );
  const [fromAccountId, setFromAccountId] = useState(
    initialValues?.fromAccountId ?? emptyValues.fromAccountId,
  );
  const [toAccountId, setToAccountId] = useState(
    initialValues?.toAccountId ?? emptyValues.toAccountId,
  );
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof getAccounts>>>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState(initialValues?.photoUrl ?? emptyValues.photoUrl);

  useEffect(() => {
    Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
      if (mode === "create") {
        const defaultAcc = accs.find((a) => a.isDefault) ?? accs[0];
        if (defaultAcc) {
          setFromAccountId((prev) => prev || defaultAcc.id);
          setToAccountId((prev) => prev || defaultAcc.id);
        }
      }
    });
  }, [mode]);

  useEffect(() => {
    if (autoFocusAmount) {
      const timer = setTimeout(() => amountInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocusAmount]);

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

    if (
      (type === TransactionType.EXPENSE || type === TransactionType.TRANSFER) &&
      !fromAccountId
    ) {
      toast.error("Select a from account");
      return;
    }

    if (
      (type === TransactionType.INCOME || type === TransactionType.TRANSFER) &&
      !toAccountId
    ) {
      toast.error("Select an account");
      return;
    }

    onSubmit({
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
  }

  return (
    <>
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
              ref={amountInputRef}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
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
          {pending ? "Saving..." : submitLabel}
        </Button>
      </form>
    </>
  );
}
