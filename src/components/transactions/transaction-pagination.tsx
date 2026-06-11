"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PickerField } from "@/components/ui/picker-field";

type TransactionPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | undefined>;
  pageSizeOptions: number[];
};

function buildHref(params: Record<string, string | undefined>, page: number) {
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) nextParams.set(key, value);
  }
  if (page > 1) nextParams.set("page", String(page));
  else nextParams.delete("page");
  return `/transactions?${nextParams.toString()}`;
}

export function TransactionPagination({
  page,
  pageSize,
  total,
  params,
  pageSizeOptions,
}: TransactionPaginationProps) {
  const router = useRouter();
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const perPageOptions = pageSizeOptions.map((option) => ({
    value: String(option),
    label: `${option} per page`,
  }));

  function updatePageSize(value: string) {
    router.push(buildHref({ ...params, perPage: value }, 1));
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {start}-{end} of {total}
        </p>
        <PickerField
          value={String(pageSize)}
          onValueChange={updatePageSize}
          options={perPageOptions}
          placeholder="Per page"
          title="Transactions per page"
          triggerClassName="w-full sm:w-[150px]"
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:justify-end">
        <Button variant="outline" size="sm" disabled={!hasPrevious} asChild={hasPrevious}>
          {hasPrevious ? (
            <Link
              href={buildHref(params, page - 1)}
              className="min-w-[100px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </>
          )}
        </Button>
        <span className="whitespace-nowrap px-2 text-center text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={!hasNext} asChild={hasNext}>
          {hasNext ? (
            <Link
              href={buildHref(params, page + 1)}
              className="min-w-[100px]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
