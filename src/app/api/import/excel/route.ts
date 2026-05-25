import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { parseExcelWorkbook } from "@/lib/import/excel";
import { importExcelData } from "@/lib/import/excel-importer";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files are supported" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseExcelWorkbook(buffer);
    const summary = await importExcelData(session.user.id, parsed);

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
