"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/portal/status", { cache: "no-store" });
        const status = (await response.json()) as PortalPublicStatus;
        if (active) {
          const isConnected = response.ok && status.connected;
          setConnected(isConnected);
          onStatusChange?.(isConnected);
        }
      } catch {
        if (active) {
          setConnected(false);
          onStatusChange?.(false);
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
          ? "Koneksi ke server Billing aktif"
          : "Server Billing tidak terhubung. Login dan pembelian sedang dinonaktifkan."
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
      Billing {connected ? "aktif" : "nonaktif"}
    </span>
  );
}
