"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 text-accent" />
        <div>
          <p className="text-sm font-medium">Install Money Manager</p>
          <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await deferredPrompt.prompt();
            setDeferredPrompt(null);
          }}
        >
          Install
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
