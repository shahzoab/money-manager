"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { OFFLINE_QUEUE_CHANGED_EVENT } from "@/lib/offline-db";
import { getPendingCount } from "@/lib/offline-data";
import {
  OFFLINE_SYNC_STATUS_EVENT,
  type OfflineSyncStatus,
} from "@/components/offline/offline-queue-sync";

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<OfflineSyncStatus>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced",
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    const handleSyncStatus = (event: Event) => {
      const customEvent = event as CustomEvent<OfflineSyncStatus>;
      if (customEvent.detail) {
        setStatus(customEvent.detail);
      }
    };

    const handleConnectivity = () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        setStatus("offline");
      }
      void refreshPendingCount();
    };

    const timer = window.setTimeout(() => {
      void refreshPendingCount();
    }, 0);

    window.addEventListener(OFFLINE_SYNC_STATUS_EVENT, handleSyncStatus);
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refreshPendingCount);
    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OFFLINE_SYNC_STATUS_EVENT, handleSyncStatus);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refreshPendingCount);
      window.removeEventListener("online", handleConnectivity);
      window.removeEventListener("offline", handleConnectivity);
    };
  }, [refreshPendingCount]);

  const label = (() => {
    if (status === "syncing") return "Syncing…";
    if (status === "error") return "Sync error";
    if (!isOnline) {
      return pendingCount > 0 ? `Offline (${pendingCount} pending)` : "Offline";
    }
    if (pendingCount > 0) return `${pendingCount} pending`;
    return "Synced";
  })();

  const config = {
    synced: { icon: Cloud, color: "text-accent-secondary" },
    syncing: { icon: RefreshCw, color: "text-accent" },
    offline: { icon: CloudOff, color: "text-yellow-500" },
    error: { icon: AlertCircle, color: "text-red-500" },
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
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
