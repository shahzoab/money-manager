import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { isPushConfigured, sendPushNotificationToUser } from "@/lib/push";

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: "Invalid push subscription" },
      { status: 400 },
    );
  }

  const subscription = await db.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: {
      userId: session.user.id,
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

  const subscriptionCount = await db.pushSubscription.count({
    where: { userId: session.user.id },
  });

  if (subscriptionCount === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const result = await sendPushNotificationToUser(session.user.id, {
    title: "Money Manager test",
    body: "Push notifications are working.",
    url: "/settings",
  });

  return NextResponse.json({ sent: result.sent });
}
