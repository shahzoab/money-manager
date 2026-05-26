"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PwaInstallPrompt } from "@/components/pwa/install-prompt";

type MobileBottomBarProps = {
  addButton: React.ReactNode;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function MobileBottomBar({ addButton }: MobileBottomBarProps) {
  const isClient = useIsClient();

  if (!isClient) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4 lg:hidden">
      <div className="pointer-events-auto">{addButton}</div>
      <div className="pointer-events-auto w-full max-w-md">
        <PwaInstallPrompt />
      </div>
    </div>,
    document.body,
  );
}
