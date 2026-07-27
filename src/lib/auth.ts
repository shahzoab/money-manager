import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { provisionUserData } from "@/lib/user-provisioning";
import { isRegistrationEnabled } from "@/lib/registration";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {},
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "memory",
    customRules: {
      "/sign-in/*": { window: 300, max: 5 },
      "/sign-up/*": { window: 300, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        async before() {
          return isRegistrationEnabled();
        },
      },
    },
    session: {
      create: {
        async before(session) {
          await provisionUserData(session.userId);
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
