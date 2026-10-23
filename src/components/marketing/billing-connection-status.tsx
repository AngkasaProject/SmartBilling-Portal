"use client";

import { useEffect, useRef, useState } from "react";
import type { PortalPublicStatus } from "@/lib/billing-api";

interface BillingConnectionStatusProps {
  initialStatus: PortalPublicStatus;
  compact?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

export function BillingConnectionStatus({
  initialStatus,
  compact = false,
  onStatusChange,
}: BillingConnectionStatusProps) {
  const [connected, setConnected] = useState(initialStatus.connected);
  const consecutiveFailures = useRef(0);

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/portal/status", {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        const status = (await response.json()) as PortalPublicStatus;
        if (active) {
          const isConnected = response.ok && status.connected;
          if (isConnected) {
            consecutiveFailures.current = 0;
            setConnected(true);
            onStatusChange?.(true);
          } else {
            consecutiveFailures.current += 1;
            if (consecutiveFailures.current >= 2) {
              setConnected(false);
              onStatusChange?.(false);
            }
          }
        }
      } catch {
        if (active) {
          consecutiveFailures.current += 1;
          if (consecutiveFailures.current >= 2) {
            setConnected(false);
            onStatusChange?.(false);
          }
        }
      }
    };
    void checkStatus();
    const interval = window.setInterval(() => void checkStatus(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [onStatusChange]);

  return (
    <span
      role="status"
      aria-live="polite"
      title={
        connected
          ? "Koneksi ke server aktif"
          : "Server tidak terhubung. Login dan pembelian sedang dinonaktifkan."
      }
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
        connected
          ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200"
          : "border-rose-400/25 bg-rose-400/[0.09] text-rose-200"
      } ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-emerald-400" : "bg-rose-400"
        }`}
      />
      Server {connected ? "aktif" : "nonaktif"}
    </span>
  );
}
