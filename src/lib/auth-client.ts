import { createAuthClient } from "better-auth/react";

// Better Auth uses the browser's origin when no base URL is provided.
// This keeps requests and session cookies on the site the user is visiting.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
