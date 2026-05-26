import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageTitleClass, pageSubtitleClass } from "@/lib/form-field-styles";
import { cn } from "@/lib/utils";

type TransactionPageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  sticky?: boolean;
};

export function TransactionPageHeader({
  title,
  subtitle,
  backHref = "/transactions",
  backLabel = "Back",
  sticky = true,
}: TransactionPageHeaderProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        sticky &&
          "-mx-4 -mt-4 mb-1 border-b border-border/60 bg-background/95 px-4 pb-4 pt-4 backdrop-blur-md lg:-mx-6 lg:-mt-6 lg:px-6 lg:pt-6",
      )}
    >
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <div>
        <h1 className={pageTitleClass}>{title}</h1>
        {subtitle ? (
          <p className={cn("mt-1", pageSubtitleClass)}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
