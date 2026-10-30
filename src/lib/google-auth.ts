export function getGoogleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}
