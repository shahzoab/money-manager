"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

export function LoginForm({
  registrationEnabled,
  googleEnabled,
  oauthError,
}: {
  registrationEnabled: boolean;
  googleEnabled: boolean;
  oauthError: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(
    oauthError ? "Google sign-in could not be completed. Please try again." : null,
  );

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Sign in failed");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await signUp.email({ email, password, name });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Registration failed");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login",
      });
      if (error) {
        setGoogleError(error.message ?? "Google sign-in failed. Please try again.");
      }
    } catch {
      setGoogleError("Unable to connect to Google sign-in. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-surface">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Money<span className="text-accent">Manager</span>
          </CardTitle>
          <CardDescription>Take control of your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList
              className={
                registrationEnabled ? "grid w-full grid-cols-2" : "grid w-full"
              }
            >
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              {registrationEnabled ? (
                <TabsTrigger value="signup">Register</TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || googleLoading}
                >
                  Sign In
                </Button>
              </form>
            </TabsContent>

            {registrationEnabled ? (
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || googleLoading}
                  >
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            ) : null}
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={!googleEnabled || loading || googleLoading}
          >
            {googleLoading ? "Connecting to Google…" : "Continue with Google"}
          </Button>
          {!googleEnabled ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Google sign-in is currently unavailable. Please use email and password.
            </p>
          ) : null}
          {googleError ? (
            <p role="alert" className="mt-3 text-center text-sm text-destructive">
              {googleError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
