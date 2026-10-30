import { LoginForm } from "@/components/auth/login-form";
import { isRegistrationEnabled } from "@/lib/registration";
import { getGoogleProvider } from "@/lib/google-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; state?: string | string[] }>;
}) {
  const { error, state } = await searchParams;

  return (
    <LoginForm
      registrationEnabled={isRegistrationEnabled()}
      googleEnabled={Boolean(getGoogleProvider())}
      oauthError={Boolean(error || state)}
    />
  );
}
