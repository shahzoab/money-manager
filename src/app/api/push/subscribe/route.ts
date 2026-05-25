import { NextResponse } from "next/server";
import webpush from "web-push";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@example.com",
    vapidPublic,
    vapidPrivate,
  );
}

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
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const session = await requireSession();
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: session.user.id },
  });

  const upcoming = await db.recurringPayment.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      reminderAt: { lte: new Date() },
    },
    take: 5,
  });

  for (const sub of subscriptions) {
    for (const payment of upcoming) {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: "Payment Reminder",
          body: `${payment.comment ?? "Recurring payment"} — ${Number(payment.amount).toFixed(2)}`,
          url: `/recurring?id=${payment.id}`,
        }),
      ).catch(() => {});
    }
  }

  return NextResponse.json({ sent: upcoming.length });
}
