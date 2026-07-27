import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { processDueRecurringPaymentsForUser } from "@/lib/recurring-processing";
import { revalidateUserCache } from "@/lib/cache-invalidation";

async function processDueRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Recurring processor is not configured" },
      { status: 503 },
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueRecurringPaymentsForUser();
  for (const userId of result.affectedUserIds) {
    revalidateUserCache(userId, ["recurring", "transactions", "comments"]);
  }

  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/charts");

  return NextResponse.json({
    created: result.created,
    notified: result.notified,
    processed: result.processed,
  });
}

export async function GET(request: Request) {
  return processDueRequest(request);
}

export async function POST(request: Request) {
  return processDueRequest(request);
}
