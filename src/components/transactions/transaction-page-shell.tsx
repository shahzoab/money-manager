import { cn } from "@/lib/utils";

type TransactionPageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function TransactionPageShell({ children, className }: TransactionPageShellProps) {
  return (
    <div className={cn("mx-auto min-w-0 max-w-lg space-y-5 pb-6", className)}>
      {children}
    </div>
  );
}
