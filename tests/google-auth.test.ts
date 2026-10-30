import assert from "node:assert/strict";
import test from "node:test";
import { betterAuth } from "better-auth";
import { getGoogleProvider } from "../src/lib/google-auth";

test("Google requires both credentials and ignores surrounding whitespace", () => {
  const originalId = process.env.GOOGLE_CLIENT_ID;
  const originalSecret = process.env.GOOGLE_CLIENT_SECRET;
  try {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    assert.equal(getGoogleProvider(), undefined);
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    assert.equal(getGoogleProvider(), undefined);
    process.env.GOOGLE_CLIENT_SECRET = "   ";
    assert.equal(getGoogleProvider(), undefined);
    process.env.GOOGLE_CLIENT_SECRET = " test-client-secret\n";
    process.env.GOOGLE_CLIENT_ID = " test-client-id\n";
    assert.deepEqual(getGoogleProvider(), {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
    });
  } finally {
    if (originalId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalId;
    if (originalSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = originalSecret;
  }
});

// Exercise Better Auth's real OAuth redirect and state validation without
// contacting Google or writing users to the application's database.
test("Google starts OAuth on the configured origin and returns cancellation to login", async () => {
  const origin = "http://localhost:3456";
  const auth = betterAuth({
    baseURL: origin,
    secret: "google-auth-test-secret-with-at-least-32-characters",
    socialProviders: {
      google: { clientId: "test-client-id", clientSecret: "test-client-secret" },
    },
    onAPIError: { errorURL: "/login" },
    logger: { disabled: true },
  });

  const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "/dashboard",
      errorCallbackURL: "/login",
    }),
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  const authorizationURL = new URL(result.url);
  assert.equal(authorizationURL.origin, "https://accounts.google.com");
  assert.equal(authorizationURL.searchParams.get("client_id"), "test-client-id");
  assert.equal(authorizationURL.searchParams.get("redirect_uri"), `${origin}/api/auth/callback/google`);
  const state = authorizationURL.searchParams.get("state");
  assert.ok(state);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  assert.ok(cookies);

  const callback = new URL(`${origin}/api/auth/callback/google`);
  callback.searchParams.set("state", state);
  callback.searchParams.set("error", "access_denied");
  const cancelled = await auth.handler(new Request(callback, { headers: { Cookie: cookies } }));
  assert.equal(cancelled.status, 302);
  const destination = new URL(cancelled.headers.get("location")!, origin);
  assert.equal(destination.pathname, "/login");
  assert.equal(destination.searchParams.get("error"), "access_denied");

  const invalidState = await auth.handler(new Request(callback));
  assert.equal(invalidState.status, 302);
  const recovery = new URL(invalidState.headers.get("location")!, origin);
  assert.equal(recovery.pathname, "/login");
  assert.ok(recovery.searchParams.has("error"));
});
