"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, X } from "lucide-react";
import { TransactionType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PickerField } from "@/components/ui/picker-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCommentSuggestions, previewTransferConversion } from "@/actions/transactions";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import {
  getCachedAccounts,
  getCachedCategories,
  getCachedCommentSuggestions,
} from "@/lib/offline-data";
import { AmountCalculator } from "@/components/transactions/amount-calculator";
import { EntityBadge } from "@/components/ui/entity-badge";
import { transactionTypeStyles } from "@/lib/transaction-type-styles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  toAmount: string;
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
  toAmount?: number;
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
  toAmount: "",
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
  const skipAccountConversionReset = useRef(!!initialValues?.toAmount);
  const initialTransferAmountsRef = useRef({
    amount: initialValues?.amount ?? emptyValues.amount,
    toAmount: initialValues?.toAmount ?? emptyValues.toAmount,
  });
  const prevTransferAccountsRef = useRef({
    fromAccountId: initialValues?.fromAccountId ?? emptyValues.fromAccountId,
    toAccountId: initialValues?.toAccountId ?? emptyValues.toAccountId,
  });
  const [type, setType] = useState<TransactionType>(
    initialValues?.type ?? emptyValues.type,
  );
  const [amount, setAmount] = useState(initialValues?.amount ?? emptyValues.amount);
  const [toAmount, setToAmount] = useState(initialValues?.toAmount ?? emptyValues.toAmount);
  const [lastEditedAmountField, setLastEditedAmountField] = useState<"from" | "to">(
    initialValues?.toAmount ? "to" : "from",
  );
  const [transferRate, setTransferRate] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
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
  type FormAccount = Awaited<ReturnType<typeof getAccounts>>[number];
  type FormCategory = Awaited<ReturnType<typeof getCategories>>[number];
  const [accounts, setAccounts] = useState<FormAccount[]>([]);
  const [categories, setCategories] = useState<FormCategory[]>([]);
  const [photoUrl, setPhotoUrl] = useState(initialValues?.photoUrl ?? emptyValues.photoUrl);

  const typeStyles = transactionTypeStyles(type);

  useEffect(() => {
    async function loadFormData() {
      let accs = await getCachedAccounts();
      let cats = await getCachedCategories();

      if (navigator.onLine) {
        try {
          const [serverAccs, serverCats] = await Promise.all([
            getAccounts(),
            getCategories(),
          ]);
          accs = serverAccs;
          cats = serverCats;
        } catch {
          // Keep cached fallback when server actions fail.
        }
      }

      setAccounts(accs as FormAccount[]);
      setCategories(cats as FormCategory[]);
      if (mode === "create") {
        const defaultAcc = accs.find((a) => a.isDefault) ?? accs[0];
        if (defaultAcc) {
          setFromAccountId((prev) => prev || defaultAcc.id);
          setToAccountId((prev) => prev || defaultAcc.id);
        }
      }
    }

    void loadFormData();
  }, [mode]);

  const searchComments = useCallback(async (query: string) => {
    if (navigator.onLine) {
      try {
        return await getCommentSuggestions(query);
      } catch {
        return getCachedCommentSuggestions(query);
      }
    }
    return getCachedCommentSuggestions(query);
  }, []);

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
      <EntityBadge icon={c.icon} color={c.color} size="field">
        {c.name}
      </EntityBadge>
    ),
  }));

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: (
      <EntityBadge icon={a.icon} color={a.color} size="field" fallback="wallet">
        {a.name} ({a.currency})
      </EntityBadge>
    ),
  }));

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const isCrossCurrencyTransfer =
    type === TransactionType.TRANSFER &&
    !!fromAccount &&
    !!toAccount &&
    fromAccount.currency !== toAccount.currency;

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReset = (clearToAmount = false) => {
      resetTimer = setTimeout(() => {
        if (clearToAmount) setToAmount("");
        setTransferRate(null);
      }, 0);
    };

    if (!isCrossCurrencyTransfer || !fromAccount || !toAccount) {
      scheduleReset();
      return () => {
        if (resetTimer) clearTimeout(resetTimer);
      };
    }

    if (lastEditedAmountField !== "from") return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      scheduleReset(true);
      return () => {
        if (resetTimer) clearTimeout(resetTimer);
      };
    }

    const timer = setTimeout(() => {
      setConverting(true);
      previewTransferConversion(fromAccount.currency, toAccount.currency, numAmount)
        .then(({ converted, rate }) => {
          setToAmount(String(Math.round(converted * 100) / 100));
          setTransferRate(rate);
        })
        .catch(() => {
          toast.error("Failed to fetch exchange rate");
        })
        .finally(() => setConverting(false));
    }, 300);

    return () => {
      if (resetTimer) clearTimeout(resetTimer);
      clearTimeout(timer);
    };
  }, [
    amount,
    fromAccount,
    toAccount,
    isCrossCurrencyTransfer,
    lastEditedAmountField,
  ]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (callback: () => void) => {
      timer = setTimeout(callback, 0);
    };

    if (type !== TransactionType.TRANSFER) {
      schedule(() => {
        setToAmount("");
        setTransferRate(null);
      });
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    if (accounts.length === 0 || !fromAccount || !toAccount) {
      return;
    }

    if (fromAccount.currency === toAccount.currency) {
      schedule(() => {
        setToAmount("");
        setTransferRate(null);
      });
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    if (skipAccountConversionReset.current) {
      skipAccountConversionReset.current = false;
      const numAmount = parseFloat(initialTransferAmountsRef.current.amount);
      const numToAmount = parseFloat(initialTransferAmountsRef.current.toAmount);
      if (numAmount > 0 && numToAmount > 0) {
        schedule(() => {
          setTransferRate(numToAmount / numAmount);
        });
      }
      prevTransferAccountsRef.current = { fromAccountId, toAccountId };
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    const accountsChanged =
      prevTransferAccountsRef.current.fromAccountId !== fromAccountId ||
      prevTransferAccountsRef.current.toAccountId !== toAccountId;
    prevTransferAccountsRef.current = { fromAccountId, toAccountId };

    if (accountsChanged) {
      schedule(() => {
        setLastEditedAmountField("from");
      });
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    type,
    fromAccountId,
    toAccountId,
    accounts.length,
    fromAccount,
    toAccount,
  ]);

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

    if (isCrossCurrencyTransfer) {
      const numToAmount = parseFloat(toAmount);
      if (!numToAmount || numToAmount <= 0) {
        toast.error("Enter a valid received amount");
        return;
      }
    }

    onSubmit({
      type,
      amount: numAmount,
      ...(isCrossCurrencyTransfer && { toAmount: parseFloat(toAmount) }),
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
        {type === TransactionType.TRANSFER && (
          <FormSection title="Account">
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
            <div className={formFieldGroupClass}>
              <Label>To Account</Label>
              <PickerField
                value={toAccountId}
                onValueChange={setToAccountId}
                options={accountOptions}
                placeholder="Select account"
                title="Select destination"
                emptyMessage="No accounts yet — add one in Settings"
              />
            </div>
          </FormSection>
        )}

        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-surface-elevated/50 px-4 py-6 text-center ring-1 ring-inset",
            typeStyles.ring,
          )}
        >
          {isCrossCurrencyTransfer ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="mb-2 block text-sm text-muted-foreground">
                  Amount ({fromAccount?.currency})
                </Label>
                <div className="flex w-full items-center justify-center gap-1">
                  <Input
                    ref={amountInputRef}
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      setLastEditedAmountField("from");
                      setAmount(e.target.value);
                    }}
                    placeholder="0.00"
                    className={cn(
                      "h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-3xl font-bold tabular-nums shadow-none focus-visible:ring-0 sm:text-4xl",
                      typeStyles.amount,
                    )}
                    required
                  />
                </div>
              </div>
              <div className="border-t border-border/50 pt-4">
                <Label htmlFor="toAmount" className="mb-2 block text-sm text-muted-foreground">
                  Received ({toAccount?.currency})
                </Label>
                <div className="flex w-full items-center justify-center gap-1">
                  <Input
                    id="toAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={toAmount}
                    onChange={(e) => {
                      setLastEditedAmountField("to");
                      const nextToAmount = e.target.value;
                      setToAmount(nextToAmount);
                      const numAmount = parseFloat(amount);
                      const numToAmount = parseFloat(nextToAmount);
                      if (numAmount > 0 && numToAmount > 0) {
                        setTransferRate(numToAmount / numAmount);
                      } else {
                        setTransferRate(null);
                      }
                    }}
                    placeholder="0.00"
                    className={cn(
                      "h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-3xl font-bold tabular-nums shadow-none focus-visible:ring-0 sm:text-4xl",
                      typeStyles.amount,
                    )}
                    required
                  />
                </div>
              </div>
              {transferRate != null && fromAccount && toAccount ? (
                <p className="text-xs text-muted-foreground">
                  {converting
                    ? "Updating rate..."
                    : `1 ${fromAccount.currency} = ${transferRate.toFixed(4)} ${toAccount.currency}`}
                </p>
              ) : null}
            </div>
          ) : (
            <>
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
            </>
          )}
          <div className="mt-3 flex justify-center">
            <AmountCalculator
              onResult={(v) => {
                setLastEditedAmountField("from");
                setAmount(String(v));
              }}
            />
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

          <div className={formFieldGroupClass}>
            <Label htmlFor="comment">Comment</Label>
            <AutocompleteInput
              id="comment"
              value={comment}
              onChange={setComment}
              onSearch={searchComments}
              placeholder="What was this for?"
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
        </FormSection>

        {type !== TransactionType.TRANSFER && (
          <FormSection title="Account">
            {type === TransactionType.EXPENSE && (
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

            {type === TransactionType.INCOME && (
              <div className={formFieldGroupClass}>
                <Label>Account</Label>
                <PickerField
                  value={toAccountId}
                  onValueChange={setToAccountId}
                  options={accountOptions}
                  placeholder="Select account"
                  title="Select account"
                  emptyMessage="No accounts yet — add one in Settings"
                />
              </div>
            )}
          </FormSection>
        )}

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
