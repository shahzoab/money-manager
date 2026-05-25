"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AmountCalculatorProps = {
  onResult: (value: number) => void;
};

export function AmountCalculator({ onResult }: AmountCalculatorProps) {
  const [expression, setExpression] = useState("");
  const [open, setOpen] = useState(false);

  function calculate() {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === "number" && isFinite(result)) {
        onResult(Math.round(result * 100) / 100);
        setOpen(false);
        setExpression("");
      }
    } catch {
      // invalid expression
    }
  }

  const buttons = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <Calculator className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Calculator</DialogTitle>
        </DialogHeader>
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          className="text-right text-xl tabular-nums"
          placeholder="0"
        />
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((btn) => (
            <Button
              key={btn}
              type="button"
              variant={btn === "=" ? "default" : "secondary"}
              onClick={() => {
                if (btn === "=") calculate();
                else setExpression((prev) => prev + btn);
              }}
            >
              {btn}
            </Button>
          ))}
        </div>
        <Button onClick={calculate} className="w-full">
          Apply
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Input(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm ${props.className ?? ""}`}
    />
  );
}
