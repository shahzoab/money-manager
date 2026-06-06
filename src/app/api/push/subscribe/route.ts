import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { isPushConfigured, sendPushNotificationToUser } from "@/lib/push";

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  const subscription = await db.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: {
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  });

  return NextResponse.json({ id: subscription.id });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  const { endpoint } = await request.json();

  await db.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint },
  });

  return NextResponse.json({ success: true });
}

export async function PUT() {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const session = await requireSession();
  const upcoming = await db.recurringPayment.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      reminderAt: { lte: new Date() },
    },
    take: 5,
  });

  for (const payment of upcoming) {
    await sendPushNotificationToUser(session.user.id, {
      title: "Payment Reminder",
      body: `${payment.comment ?? "Recurring payment"} - ${Number(payment.amount).toFixed(2)}`,
      url: `/recurring?id=${payment.id}`,
    });
  }

  return NextResponse.json({ sent: upcoming.length });
}
