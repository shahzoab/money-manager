import { LoginForm } from "@/components/auth/login-form";
import { isRegistrationEnabled } from "@/lib/registration";

export default function LoginPage() {
  return <LoginForm registrationEnabled={isRegistrationEnabled()} />;
}
