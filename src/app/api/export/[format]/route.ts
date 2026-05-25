import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { generateExcelExport } from "@/lib/export/excel";
import { generatePdfExport } from "@/lib/export/pdf";
import { getDashboardData } from "@/actions/dashboard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> },
) {
  const session = await requireSession();
  const { format } = await params;

  if (format === "excel") {
    const buffer = await generateExcelExport(session.user.id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="money-manager-export.xlsx"',
      },
    });
  }

  if (format === "pdf") {
    const data = await getDashboardData();
    const buffer = await generatePdfExport({
      period: data.period,
      totalBalance: data.totalBalance,
      income: data.income,
      expenses: data.expenses,
      currency: data.baseCurrency,
      categories: data.categoryData.map((c) => ({
        name: c.name,
        amount: c.amount,
      })),
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="money-manager-report.pdf"',
      },
    });
  }

  if (format === "backup") {
    const { generateBackupJson } = await import("@/lib/export/excel");
    const json = await generateBackupJson(session.user.id);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="money-manager-backup.json"',
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
