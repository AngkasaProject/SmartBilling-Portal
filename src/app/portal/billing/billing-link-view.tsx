"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Wifi } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BillingConnectionStatus } from "@/components/marketing/billing-connection-status";
import type {
  BillingLinkResponse,
  PortalInvoice,
  PortalPublicStatus,
} from "@/lib/billing-api";
import { PaymentDialog } from "../portal-experience";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function BillingLinkView({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus: PortalPublicStatus;
}) {
  const [billingConnected, setBillingConnected] = useState(initialStatus.connected);
  const [data, setData] = useState<BillingLinkResponse | null>(null);
  const [invoice, setInvoice] = useState<PortalInvoice | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Tautan tagihan tidak valid.");
      setLoading(false);
      return;
    }
    let active = true;
    fetch("/api/portal/billing-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Tautan tagihan tidak dapat dibuka.";
          throw new Error(message);
        }
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("customer" in payload) ||
          !("invoices" in payload) ||
          !Array.isArray(payload.invoices)
        ) {
          throw new Error("Data tagihan tidak sesuai format.");
        }
        if (!active) return;
        const result = payload as BillingLinkResponse;
        setData(result);
        setInvoice(result.invoices.find((item) => item.status === "unpaid") || result.invoices[0] || null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Tagihan belum tersedia.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="portal-theme min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/[0.06]">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500">
              <Wifi className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-white">Portal Pelanggan</span>
          </Link>
          <div className="flex items-center gap-2">
            <BillingConnectionStatus initialStatus={initialStatus} compact onStatusChange={setBillingConnected} />
            <Link href="/portal" className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] sm:inline-flex">
              <ArrowLeft className="h-3.5 w-3.5" />
              Portal pelanggan
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        {!billingConnected ? (
          <div role="alert" className="mb-5 flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Server Billing tidak terhubung. Pembayaran sementara tidak tersedia.
          </div>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Pembayaran</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Detail tagihan</h1>
        {loading ? (
          <p className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-sm text-slate-400">Memeriksa tautan tagihan...</p>
        ) : error ? (
          <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-5 text-sm text-rose-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : data && invoice ? (
          <section className="mt-6 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Pelanggan</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{data.customer.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {data.customer.customerId} · {data.customer.profileName}
                </p>
              </div>
              <Clock3 className="h-5 w-5 text-indigo-200" />
            </div>
            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <p className="text-xs text-slate-500">Nomor invoice</p>
              <p className="mt-1 font-semibold text-white">{invoice.invoiceNumber}</p>
              <p className="mt-4 text-xs text-slate-500">Jatuh tempo</p>
              <p className="mt-1 text-sm text-slate-200">{formatDate(invoice.dueDate)}</p>
              <p className="mt-4 text-xs text-slate-500">Total pembayaran</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatRupiah(invoice.totalAmount)}</p>
            </div>
            {invoice.status === "unpaid" ? (
              <button type="button" onClick={() => setPaymentOpen(true)} disabled={!billingConnected} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">
                Lanjutkan pembayaran
              </button>
            ) : (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                {invoice.status === "paid" ? "Tagihan ini sudah lunas." : "Tagihan ini tidak lagi dapat dibayar."}
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Tautan ini hanya memberikan akses ke detail tagihan yang ditentukan dan dapat kedaluwarsa.
            </p>
          </section>
        ) : (
          <p className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-sm text-slate-400">
            Tidak ada tagihan yang tersedia pada tautan ini.
          </p>
        )}
      </main>
      <footer className="border-t border-white/[0.06] px-5 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <span>Waktu dan tanggal menggunakan zona WIB.</span>
          <BillingConnectionStatus initialStatus={initialStatus} />
        </div>
      </footer>
      {paymentOpen && invoice ? (
        <PaymentDialog
          invoice={invoice}
          portalToken={token}
          onClose={() => setPaymentOpen(false)}
        />
      ) : null}
    </div>
  );
}
