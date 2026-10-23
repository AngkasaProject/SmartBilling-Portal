"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
const pendingVoucherOrderKey = "smartbilling:pending-voucher-order";

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
    const rawOrder = window.sessionStorage.getItem(pendingVoucherOrderKey);
    if (!rawOrder) return;
    let pendingOrder: unknown;
    try {
      pendingOrder = JSON.parse(rawOrder);
    } catch {
      window.sessionStorage.removeItem(pendingVoucherOrderKey);
      return;
    }
    if (
      typeof pendingOrder !== "object" ||
      pendingOrder === null ||
      !("orderId" in pendingOrder) ||
      typeof pendingOrder.orderId !== "string" ||
      !("phone" in pendingOrder) ||
      typeof pendingOrder.phone !== "string" ||
      !("profileId" in pendingOrder) ||
      pendingOrder.profileId !== profile.id
    ) return;
    setPhone(pendingOrder.phone);
    setOrder({
      orderId: pendingOrder.orderId,
      status: "pending",
      amount: profile.price,
    });
    setOpen(true);
  }, [profile.id, profile.price]);

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
    const latestStatus = orderStatus?.status || order?.status;
    if (
      !order ||
      !order.orderId ||
      !phone ||
      !latestStatus ||
      (latestStatus !== "pending" && latestStatus !== "settlement") ||
      orderStatus?.voucher
    ) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/portal/voucher-orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.orderId, phone }),
        });
        const result = (await response.json()) as VoucherOrderStatusResponse & { error?: string };
        if (response.ok && active) {
          setOrderStatus(result);
          setOrder((currentOrder) =>
            currentOrder ? { ...currentOrder, status: result.status } : currentOrder,
          );
          if (result.voucher || result.status === "expired" || result.status === "canceled") {
            window.sessionStorage.removeItem(pendingVoucherOrderKey);
          }
        }
      } catch {
        if (active) setError("Status pesanan sementara tidak dapat diperbarui.");
      }
    };
    const interval = window.setInterval(() => void check(), 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [order, orderStatus, phone]);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setTimeout(() => {
      setError("");
      setOrder(null);
      setOrderStatus(null);
    }, 200);
  }, [busy]);

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
        window.sessionStorage.setItem(
          pendingVoucherOrderKey,
          JSON.stringify({ orderId: result.orderId, phone, profileId: profile.id }),
        );
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
      <Button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-6 min-h-11 w-full rounded-xl bg-indigo-500 font-semibold text-white hover:bg-indigo-400"
      >
        Beli voucher
      </Button>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen) setOpen(true); else close(); }}>
        <DialogContent className="portal-theme max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-slate-900 p-5 text-white sm:rounded-3xl sm:p-6">
            <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold text-white">
                  {order ? "Pesanan voucher" : "Beli voucher hotspot"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {profile.name} · Rp {profile.price.toLocaleString("id-ID")}
                </DialogDescription>
            </DialogHeader>

            {completedVoucher ? (
              <Card className="mt-6 border-emerald-400/20 bg-emerald-400/[0.07] text-white">
                <CardContent className="p-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-3 font-semibold">Voucher siap digunakan</h3>
                <p className="mt-2 text-sm text-slate-300">KODE = <strong className="font-mono">{completedVoucher.code}</strong></p>
                <p className="mt-1 text-sm text-slate-400">Masa aktif: {completedVoucher.validityDuration}</p>
                </CardContent>
              </Card>
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
                <Label className="block text-xs font-semibold text-slate-300">
                  Nama
                  <Input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </Label>
                <Label className="block text-xs font-semibold text-slate-300">
                  Nomor WhatsApp
                  <Input required type="tel" minLength={8} maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
                </Label>
                <Label className="block text-xs font-semibold text-slate-300">
                  Email (opsional)
                  <Input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                </Label>
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
                {error ? (
                  <Alert variant="destructive" className="border-rose-400/20 bg-rose-400/[0.07] text-rose-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  disabled={busy || (!automaticAvailable && !methods.length) || (paymentMode === "manual" && !methodId)}
                  className="w-full rounded-xl bg-indigo-500 py-3 font-semibold text-white hover:bg-indigo-400"
                >
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Memproses..." : "Buat pesanan"}
                </Button>
              </form>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
