"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, X } from "lucide-react";
import { TransactionType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PickerField } from "@/components/ui/picker-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCommentSuggestions } from "@/actions/transactions";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { AmountCalculator } from "@/components/transactions/amount-calculator";
import { EntityIcon } from "@/components/ui/entity-icon";
import { transactionTypeStyles } from "@/lib/transaction-type-styles";
import { cn } from "@/lib/utils";
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
  cancelHref?: string;
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

export function TransactionForm({
  mode,
  initialValues,
  submitLabel,
  pending,
  autoFocusAmount,
  cancelHref,
  onSubmit,
}: TransactionFormProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const typeStyles = transactionTypeStyles(type);

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

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) =>
        type === TransactionType.INCOME ? c.type === "INCOME" : c.type === "EXPENSE",
      ),
    [categories, type],
  );

  const validCategoryId =
    categoryId && filteredCategories.some((category) => category.id === categoryId)
      ? categoryId
      : "";

  const categoryOptions = filteredCategories.map((c) => ({
    value: c.id,
    label: (
      <span className="flex items-center gap-3">
        <EntityIcon icon={c.icon} color={c.color} size="sm" />
        {c.name}
      </span>
    ),
  }));

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: (
      <span className="flex items-center gap-3">
        <EntityIcon icon={a.icon} color={a.color} size="sm" fallback="wallet" />
        {a.name} ({a.currency})
      </span>
    ),
  }));

  function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

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
      categoryId: validCategoryId || undefined,
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
        <TabsList className="grid w-full grid-cols-3 bg-surface-elevated p-1">
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
          <TabsTrigger
            value={TransactionType.TRANSFER}
            className={transactionTypeStyles(TransactionType.TRANSFER).tab}
          >
            Transfer
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form id="transaction-form" onSubmit={handleSubmit} className="mt-6 space-y-6 pb-28 lg:pb-0">
        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-surface-elevated/50 px-4 py-6 text-center ring-1 ring-inset",
            typeStyles.ring,
          )}
        >
          <Label htmlFor="amount" className="sr-only">
            Amount
          </Label>
          <div className="flex w-full items-center justify-center gap-1">
            {typeStyles.prefix ? (
              <span className={cn("shrink-0 text-3xl font-semibold tabular-nums", typeStyles.amount)}>
                {typeStyles.prefix}
              </span>
            ) : null}
            <Input
              ref={amountInputRef}
              id="amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={cn(
                "h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-4xl font-bold tabular-nums shadow-none focus-visible:ring-0 sm:text-5xl",
                typeStyles.amount,
              )}
              required
            />
          </div>
          <div className="mt-3 flex justify-center">
            <AmountCalculator onResult={(v) => setAmount(String(v))} />
          </div>
        </div>

        <FormSection title="Details">
          <div className={formFieldGroupClass}>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {type !== TransactionType.TRANSFER && (
            <div className={formFieldGroupClass}>
              <Label>Category</Label>
              <PickerField
                value={validCategoryId}
                onValueChange={setCategoryId}
                options={categoryOptions}
                placeholder="Select category"
                title="Select category"
                emptyMessage="No categories yet — add one in Settings"
              />
            </div>
          )}

          <div className={formFieldGroupClass}>
            <Label htmlFor="comment">Comment</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                getCommentSuggestions(e.target.value).then(setSuggestions);
              }}
              placeholder="What was this for?"
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
        </FormSection>

        <FormSection title="Account">
          {(type === TransactionType.EXPENSE || type === TransactionType.TRANSFER) && (
            <div className={formFieldGroupClass}>
              <Label>From Account</Label>
              <PickerField
                value={fromAccountId}
                onValueChange={setFromAccountId}
                options={accountOptions}
                placeholder="Select account"
                title="Select account"
                emptyMessage="No accounts yet — add one in Settings"
              />
            </div>
          )}

          {(type === TransactionType.INCOME || type === TransactionType.TRANSFER) && (
            <div className={formFieldGroupClass}>
              <Label>
                {type === TransactionType.TRANSFER ? "To Account" : "Account"}
              </Label>
              <PickerField
                value={toAccountId}
                onValueChange={setToAccountId}
                options={accountOptions}
                placeholder="Select account"
                title={type === TransactionType.TRANSFER ? "Select destination" : "Select account"}
                emptyMessage="No accounts yet — add one in Settings"
              />
            </div>
          )}
        </FormSection>

        <FormSection title="Receipt">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0])}
          />
          {photoUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Receipt preview" className="max-h-48 w-full object-contain" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={() => {
                  setPhotoUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                aria-label="Remove receipt"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface/50 px-4 py-8 text-muted-foreground transition-colors hover:border-accent/50 hover:bg-surface-elevated/50 hover:text-foreground"
            >
              <Camera className="h-8 w-8 opacity-60" />
              <span className="text-sm font-medium">Add receipt photo</span>
              <span className="text-xs">Tap to take or upload</span>
            </button>
          )}
        </FormSection>

        <div className="hidden gap-2 lg:flex">
          {cancelHref ? (
            <Button type="button" variant="outline" className="flex-1" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          ) : null}
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          {cancelHref ? (
            <Button type="button" variant="outline" className="flex-1" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          ) : null}
          <Button
            type="submit"
            form="transaction-form"
            className="flex-1"
            disabled={pending}
          >
            {pending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
