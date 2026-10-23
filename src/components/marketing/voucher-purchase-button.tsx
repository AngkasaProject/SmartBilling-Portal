"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";
import type {
  ManualPaymentMethod,
  PaymentOptionsResponse,
  PublicHotspotProfile,
  VoucherOrderResponse,
  VoucherOrderStatusResponse,
} from "@/lib/billing-api";

interface VoucherPurchaseButtonProps {
  profile: PublicHotspotProfile;
  disabled: boolean;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/15";

export function VoucherPurchaseButton({
  profile,
  disabled,
}: VoucherPurchaseButtonProps) {
  const [open, setOpen] = useState(false);
  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [automaticAvailable, setAutomaticAvailable] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"automatic" | "manual">("automatic");
  const [methodId, setMethodId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<VoucherOrderResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<VoucherOrderStatusResponse | null>(null);

  useEffect(() => {
    if (!open || order) return;
    let active = true;
    fetch("/api/portal/payment-options", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as PaymentOptionsResponse & { error?: string };
        if (!response.ok) throw new Error(result.error || "Metode pembayaran tidak tersedia");
        if (!active) return;
        setMethods(result.manualMethods || []);
        setAutomaticAvailable(Boolean(result.automaticAvailable));
        const nextMode = result.automaticAvailable ? "automatic" : "manual";
        setPaymentMode(nextMode);
        setMethodId(result.manualMethods?.[0]?.id || "");
      })
      .catch((fetchError: unknown) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      });
    return () => {
      active = false;
    };
  }, [open, order]);

  useEffect(() => {
    if (!order || order.status !== "pending" || !order.orderId || !phone) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/portal/voucher-orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.orderId, phone }),
        });
        const result = (await response.json()) as VoucherOrderStatusResponse & { error?: string };
        if (response.ok && active) setOrderStatus(result);
      } catch {
        if (active) setError("Status pesanan sementara tidak dapat diperbarui.");
      }
    };
    const interval = window.setInterval(() => void check(), 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [order, phone]);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setTimeout(() => {
      setError("");
      setOrder(null);
      setOrderStatus(null);
    }, 200);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, close]);

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/portal/voucher-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          customerName: name,
          phone,
          email: email || undefined,
          paymentMode,
          ...(paymentMode === "manual" ? { methodId } : {}),
        }),
      });
      const result = (await response.json()) as VoucherOrderResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Pesanan belum dapat dibuat");
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setOrder(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setBusy(false);
    }
  };

  const completedVoucher = orderStatus?.voucher;
  const selectedMethod = methods.find((method) => method.id === order?.method?.id);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Beli voucher
      </button>
      {open ? createPortal(
        <div
          className="portal-theme fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-checkout-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="voucher-checkout-title" className="text-lg font-bold">
                  {order ? "Pesanan voucher" : "Beli voucher hotspot"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {profile.name} · Rp {profile.price.toLocaleString("id-ID")}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {completedVoucher ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-3 font-semibold">Voucher siap digunakan</h3>
                <p className="mt-2 text-sm text-slate-300">KODE = <strong className="font-mono">{completedVoucher.code}</strong></p>
                <p className="mt-1 text-sm text-slate-400">Masa aktif: {completedVoucher.validityDuration}</p>
              </div>
            ) : order ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-300">
                  Kode pesanan: <strong className="font-mono text-white">{order.paymentCode || order.orderId}</strong>
                </p>
                <p className="text-sm text-slate-300">
                  Status: {orderStatus?.status || order.status}
                </p>
                {(selectedMethod || order.method) ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-300">
                    <p className="font-semibold text-white">{selectedMethod?.name || order.method?.name}</p>
                    {order.method?.accountNumber ? <p>{order.method.accountNumber}</p> : null}
                    {order.method?.accountHolder ? <p>Atas nama: {order.method.accountHolder}</p> : null}
                    {order.method?.instructions ? <p className="mt-2 whitespace-pre-line">{order.method.instructions}</p> : null}
                    {order.expiresAtFormatted ? <p className="mt-2 text-xs text-amber-200">Batas pembayaran: {order.expiresAtFormatted}</p> : null}
                  </div>
                ) : null}
                {order.method ? (
                  order.operatorUrl ? (
                    <a href={order.operatorUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2.5 text-center text-sm font-semibold text-emerald-100 hover:bg-emerald-400/[0.12]">
                      Konfirmasi pembayaran via WhatsApp
                    </a>
                  ) : (
                    <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3 text-xs text-amber-100">
                      Nomor WhatsApp Customer Service belum tersedia. Simpan kode pembayaran dan hubungi operator melalui kontak yang tersedia.
                    </p>
                  )
                ) : null}
                {order.status === "pending" && !orderStatus?.voucher ? (
                  <p className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Menunggu konfirmasi pembayaran
                  </p>
                ) : null}
              </div>
            ) : (
              <form onSubmit={placeOrder} className="mt-6 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Nama
                  <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Nomor WhatsApp
                  <input required type="tel" minLength={8} maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Email (opsional)
                  <input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Metode pembayaran
                  <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as "automatic" | "manual")} className={inputClass}>
                    {automaticAvailable ? <option value="automatic">Pembayaran otomatis</option> : null}
                    {methods.length ? <option value="manual">Transfer manual</option> : null}
                  </select>
                </label>
                {paymentMode === "manual" && methods.length ? (
                  <label className="block text-xs font-semibold text-slate-300">
                    Pilih metode
                    <select value={methodId} onChange={(event) => setMethodId(event.target.value)} className={inputClass}>
                      {methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
                    </select>
                  </label>
                ) : null}
                {error ? <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs text-rose-200">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy || (!automaticAvailable && !methods.length) || (paymentMode === "manual" && !methodId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Memproses..." : "Buat pesanan"}
                </button>
              </form>
            )}
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
