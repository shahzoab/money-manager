import { createUploadthing, type FileRouter } from "uploadthing/next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  transactionPhoto: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
