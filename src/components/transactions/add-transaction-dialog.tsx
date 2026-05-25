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
import { createTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { toast } from "sonner";

type AddTransactionDialogProps = {
  trigger: React.ReactNode;
  defaultType?: TransactionType;
};

export function AddTransactionDialog({ trigger, defaultType }: AddTransactionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>

        <TransactionForm
          mode="create"
          submitLabel="Save Transaction"
          pending={pending}
          initialValues={{ type: defaultType ?? TransactionType.EXPENSE }}
          onSubmit={(data) => {
            startTransition(async () => {
              try {
                await createTransaction(data);
                router.refresh();
                toast.success("Transaction added");
                setOpen(false);
              } catch {
                toast.error("Failed to add transaction");
              }
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
