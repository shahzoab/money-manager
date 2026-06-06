import webpush from "web-push";
import { db } from "@/lib/db";

type PushPayload = {
  title: string;
  body: string;
  url: string;
};

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
let configured = false;

export function isPushConfigured() {
  return Boolean(vapidPublic && vapidPrivate);
}

function configureWebPush() {
  if (configured || !vapidPublic || !vapidPrivate) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@example.com",
    vapidPublic,
    vapidPrivate,
  );
  configured = true;
}

function isExpiredSubscriptionError(error: unknown) {
  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushNotificationToUser(
  userId: string,
  payload: PushPayload,
) {
  if (!isPushConfigured()) {
    return { sent: 0, skipped: true };
  }

  configureWebPush();

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (error) {
      if (isExpiredSubscriptionError(error)) {
        await db.pushSubscription.delete({
          where: { id: subscription.id },
        });
      }
    }
  }

  return { sent, skipped: false };
}
