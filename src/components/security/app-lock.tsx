"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyPin, setAppLockVerified, isAppLockVerified } from "@/lib/app-lock";

type AppLockScreenProps = {
  pinHash: string;
};

export function AppLockScreen({ pinHash }: AppLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(true);

  useEffect(() => {
    setUnlocked(isAppLockVerified());
  }, []);

  if (unlocked) return null;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const valid = await verifyPin(pin, pinHash);
    if (valid) {
      setAppLockVerified();
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <CardTitle>Enter PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="text-center text-2xl tracking-[0.5em]"
              autoFocus
            />
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppLockProvider({
  enabled,
  pinHash,
  children,
}: {
  enabled: boolean;
  pinHash: string | null;
  children: React.ReactNode;
}) {
  if (!enabled || !pinHash) return <>{children}</>;
  return (
    <>
      <AppLockScreen pinHash={pinHash} />
      {children}
    </>
  );
}
