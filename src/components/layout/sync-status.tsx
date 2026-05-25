"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/lib/offline-db";

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>("synced");

  useEffect(() => {
    const update = () => {
      setStatus(navigator.onLine ? "synced" : "offline");
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const config = {
    synced: { icon: Cloud, label: "Synced", color: "text-accent-secondary" },
    syncing: { icon: RefreshCw, label: "Syncing", color: "text-accent" },
    offline: { icon: CloudOff, label: "Offline", color: "text-yellow-500" },
    error: { icon: AlertCircle, label: "Sync error", color: "text-red-500" },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium",
        config.color,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
