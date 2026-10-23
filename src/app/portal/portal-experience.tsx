"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  LogOut,
  RefreshCw,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BillingConnectionStatus } from "@/components/marketing/billing-connection-status";
import type {
  ManualPaymentMethod,
  PaymentOptionsResponse,
  PaymentResponse,
  PortalCustomer,
  PortalDashboardResponse,
  PortalInvoice,
  PortalPublicStatus,
  PublicPppoePackage,
} from "@/lib/billing-api";

interface PortalExperienceProps {
  initialSession: { name: string; phone: string } | null;
  initialStatus: PortalPublicStatus;
}

type PortalAction = "schedule-upgrade" | "cancel-subscription";

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/15";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | undefined): string {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date) + " WIB";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function isDashboard(value: unknown): value is PortalDashboardResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.customer === "object" &&
    record.customer !== null &&
    Array.isArray(record.invoices) &&
    Array.isArray(record.upgradePackages) &&
    typeof record.paymentAvailable === "boolean"
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return `Permintaan gagal (HTTP ${response.status})`;
}

export function PortalExperience({
  initialSession,
  initialStatus,
}: PortalExperienceProps) {
  const [session, setSession] = useState(initialSession);
  const [billingConnected, setBillingConnected] = useState(
    initialStatus.connected,
  );
  const [dashboard, setDashboard] = useState<PortalDashboardResponse | null>(
    null,
  );
  const [loadingDashboard, setLoadingDashboard] = useState(Boolean(initialSession));
  const [dashboardError, setDashboardError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"upgrade" | "cancel" | PortalInvoice | null>(
    null,
  );
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError("");
    try {
      const response = await fetch("/api/portal/me", { cache: "no-store" });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const payload: unknown = await response.json();
      if (!isDashboard(payload)) {
        throw new Error("Data dashboard dari Billing tidak sesuai format.");
      }
      setDashboard(payload);
    } catch (error) {
      setDashboard(null);
      setDashboardError(
        error instanceof Error ? error.message : "Data pelanggan belum tersedia.",
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    if (session) void refreshDashboard();
  }, [session, refreshDashboard, refreshKey]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/portal/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sesi belum dapat ditutup. Coba lagi.");
      setSession(null);
      setDashboard(null);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sesi belum dapat ditutup. Coba lagi.");
    }
  };

  const submitAction = async (action: PortalAction) => {
    setActionBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/portal/customer-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "schedule-upgrade" ? { packageId: selectedPackageId } : {}),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Permintaan belum dapat diproses.";
        throw new Error(message);
      }
      setModal(null);
      setNotice(
        action === "schedule-upgrade"
          ? "Paket baru dijadwalkan. Paket akan aktif setelah tagihan periode berikutnya dibayar."
          : "Pemberhentian langganan dijadwalkan pada akhir masa layanan yang sudah dibayar.",
      );
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Permintaan belum dapat diproses.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const whatsappLink = useMemo(() => {
    const number = initialStatus.operatorWhatsapp?.replace(/\D/g, "");
    if (!number) return "";
    const message = `Halo CS, saya pelanggan ${dashboard?.customer.name || session?.name || ""} (${session?.phone ?? ""}) dan ingin bertanya tentang layanan internet.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }, [initialStatus.operatorWhatsapp, session, dashboard?.customer.name]);

  const brandName =
    initialStatus.companyName?.trim() ||
    initialStatus.brandName?.trim() ||
    initialStatus.appName?.trim() ||
    "SmartBilling";

  return (
    <div className="portal-theme min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/[0.06] bg-white/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500">
              <Wifi className="h-5 w-5 text-white" />
            </span>
            <span className="truncate text-sm font-semibold text-white">{brandName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <BillingConnectionStatus
              initialStatus={initialStatus}
              compact
              onStatusChange={setBillingConnected}
            />
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => void refreshDashboard()}
                  disabled={loadingDashboard}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingDashboard ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Perbarui</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              </>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Beranda
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
        {!billingConnected ? (
          <div className="mb-6 flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-100" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Server Billing tidak terhubung. Login dan pengelolaan layanan sementara tidak tersedia. Silakan coba kembali saat koneksi pulih.</p>
          </div>
        ) : null}

        {session ? (
          <section aria-labelledby="portal-heading">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Portal pelanggan
              </p>
              <h1 id="portal-heading" className="mt-2 text-3xl font-bold tracking-tight text-white">
                Halo, {dashboard?.customer.name || session.name}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Ringkasan layanan dan tagihan untuk akun {session.phone}.
              </p>
            </div>
            {notice ? (
              <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-indigo-300/15 bg-indigo-400/[0.07] p-4 text-sm text-indigo-100">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{notice}</p>
              </div>
            ) : null}
            {dashboardError ? (
              <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-100">
                <span className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  {dashboardError}
                </span>
                <button type="button" onClick={() => void refreshDashboard()} className="shrink-0 underline underline-offset-4">Coba lagi</button>
              </div>
            ) : null}
            {loadingDashboard ? (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-10 text-center text-sm text-slate-400">
                <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
                Memuat informasi pelanggan...
              </div>
            ) : dashboard ? (
              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <SubscriptionCard
                    customer={dashboard.customer}
                    upgradePackages={dashboard.upgradePackages}
                    canManage={billingConnected}
                    cancellationScheduled={Boolean(dashboard.customer.cancelAtExpiry)}
                    onUpgrade={() => {
                      setSelectedPackageId(dashboard.upgradePackages[0]?.id || "");
                      setModal("upgrade");
                    }}
                    onCancel={() => setModal("cancel")}
                    whatsappLink={whatsappLink}
                  />
                  <InvoiceList
                    invoices={dashboard.invoices}
                    onPay={(invoice) => setModal(invoice)}
                  />
                </div>
                <div className="space-y-5">
                  <CustomerDetails customer={dashboard.customer} />
                  <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10">
                        <CircleHelp className="h-5 w-5 text-violet-200" />
                      </span>
                      <div>
                        <h2 className="font-semibold text-white">Butuh bantuan?</h2>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                          Hubungi Customer Service untuk bantuan perubahan paket atau pertanyaan layanan.
                        </p>
                      </div>
                    </div>
                    {whatsappLink ? (
                      <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
                        Hubungi CS via WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <LoginPanel
            billingConnected={billingConnected}
            onAuthenticated={(name, phone) => {
              setSession({ name: name || "Pelanggan", phone });
              setLoadingDashboard(true);
              setNotice("");
            }}
          />
        )}
      </main>

      {modal === "upgrade" && dashboard ? (
        <Modal title="Jadwalkan upgrade paket" onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-slate-400">
            Pilih paket bulanan berikutnya. Paket baru mulai berlaku setelah tagihan periode berikutnya dibayar.
          </p>
          {dashboard.upgradePackages.length ? (
            <>
              <label className="mt-5 block text-sm font-medium text-slate-200" htmlFor="upgrade-package">
                Paket baru
              </label>
              <select
                id="upgrade-package"
                value={selectedPackageId}
                onChange={(event) => setSelectedPackageId(event.target.value)}
                className={inputClass}
              >
                {dashboard.upgradePackages.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {formatRupiah(plan.monthlyFee)} / bulan
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Tagihan berikutnya akan memakai harga paket yang dipilih. Perubahan tidak langsung memutus layanan saat ini.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300">Kembali</button>
                <button type="button" disabled={!selectedPackageId || actionBusy || !billingConnected} onClick={() => void submitAction("schedule-upgrade")} className={buttonClass}>
                  {actionBusy ? "Memproses..." : "Konfirmasi upgrade"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-slate-400">
              Belum ada paket upgrade yang kompatibel untuk layanan Anda. Silakan hubungi Customer Service.
            </p>
          )}
        </Modal>
      ) : null}

      {modal === "cancel" ? (
        <Modal title="Berhenti berlangganan?" onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-slate-300">
            Permintaan ini menjadwalkan pemberhentian pada akhir masa layanan yang sudah dibayar. Layanan tetap aktif sampai tanggal berakhir dan pengingat tagihan berikutnya dihentikan.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300">Jangan dulu</button>
            <button type="button" disabled={actionBusy || !billingConnected} onClick={() => void submitAction("cancel-subscription")} className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50">
              {actionBusy ? "Memproses..." : "Jadwalkan berhenti"}
            </button>
          </div>
        </Modal>
      ) : null}

      {typeof modal === "object" && modal !== null ? (
        <PaymentDialog invoice={modal} onClose={() => setModal(null)} />
      ) : null}

      <footer className="border-t border-white/[0.06] px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <span>Informasi layanan disediakan oleh {brandName}. Waktu ditampilkan dalam WIB.</span>
          <BillingConnectionStatus initialStatus={initialStatus} />
        </div>
      </footer>
    </div>
  );
}

function LoginPanel({
  billingConnected,
  onAuthenticated,
}: {
  billingConnected: boolean;
  onAuthenticated: (name: string, phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/portal/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Kode verifikasi belum dapat dikirim.";
        throw new Error(message);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("verificationToken" in payload) ||
        typeof payload.verificationToken !== "string"
      ) {
        throw new Error("Respons verifikasi tidak valid.");
      }
      setVerificationToken(payload.verificationToken);
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kode verifikasi belum dapat dikirim.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/portal/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, verificationToken }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const payload: unknown = await response.json().catch(() => null);
      if (typeof payload !== "object" || payload === null || !("ok" in payload) || payload.ok !== true) {
        throw new Error("Login belum dapat diselesaikan.");
      }
      onAuthenticated("", phone);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kode salah atau kedaluwarsa.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] shadow-xl md:grid-cols-[1fr_0.9fr]">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-8 md:flex">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          <Wifi className="h-6 w-6 text-indigo-200" />
        </span>
        <div>
          <h1 className="text-3xl font-bold leading-tight text-white">Semua layanan Anda, dalam satu tempat.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Masuk dengan nomor WhatsApp yang terdaftar untuk melihat status layanan, kuota, dan tagihan.
          </p>
        </div>
        <p className="text-xs text-slate-500">Akses aman menggunakan kode verifikasi sekali pakai.</p>
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Akun pelanggan</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Masuk ke portal</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {sent
            ? `Masukkan kode 6 digit yang dikirim ke WhatsApp ${phone}.`
            : "Masukkan nomor WhatsApp yang terdaftar di akun layanan."}
        </p>
        {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2.5 text-sm text-rose-100">{error}</p> : null}
        {!sent ? (
          <form onSubmit={(event) => void sendCode(event)} className="mt-6">
            <label htmlFor="portal-phone" className="text-sm font-medium text-slate-200">Nomor WhatsApp</label>
            <input
              id="portal-phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={32}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Contoh: 081234567890"
              className={inputClass}
            />
            <button type="submit" disabled={busy || !billingConnected} className={`${buttonClass} mt-5 w-full`}>
              {busy ? "Mengirim kode..." : "Kirim kode verifikasi"}
            </button>
          </form>
        ) : (
          <form onSubmit={(event) => void verifyCode(event)} className="mt-6">
            <label htmlFor="portal-code" className="text-sm font-medium text-slate-200">Kode verifikasi</label>
            <input
              id="portal-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className={`${inputClass} text-center text-lg tracking-[0.35em]`}
            />
            <button type="submit" disabled={busy || code.length !== 6 || !billingConnected} className={`${buttonClass} mt-5 w-full`}>
              {busy ? "Memverifikasi..." : "Verifikasi & masuk"}
            </button>
            <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); setVerificationToken(""); setError(""); }} className="mt-3 w-full py-2 text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200">
              Ganti nomor atau kirim ulang kode
            </button>
          </form>
        )}
        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          Kode berlaku terbatas dan hanya dapat digunakan satu kali. Jangan bagikan kode kepada siapa pun.
        </p>
      </div>
    </div>
  );
}

function SubscriptionCard({
  customer,
  upgradePackages,
  canManage,
  cancellationScheduled,
  onUpgrade,
  onCancel,
  whatsappLink,
}: {
  customer: PortalCustomer;
  upgradePackages: PublicPppoePackage[];
  canManage: boolean;
  cancellationScheduled: boolean;
  onUpgrade: () => void;
  onCancel: () => void;
  whatsappLink: string;
}) {
  const statusLabel: Record<PortalCustomer["status"], string> = {
    active: "Aktif",
    expiring: "Segera berakhir",
    isolated: "Terisolasi",
    disabled: "Nonaktif",
  };
  const statusStyle =
    customer.status === "active"
      ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200"
      : "border-amber-400/20 bg-amber-400/[0.08] text-amber-100";

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Layanan internet</p>
          <h2 className="mt-2 text-xl font-bold text-white">{customer.profileName || customer.bandwidthLimit}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle}`}>
          {cancellationScheduled ? "Berhenti dijadwalkan" : statusLabel[customer.status]}
        </span>
      </div>
      {customer.pendingPackageName ? (
        <p className="mt-4 rounded-xl border border-indigo-300/15 bg-indigo-400/[0.06] px-3 py-2.5 text-sm text-indigo-100">
          Upgrade terjadwal: {customer.pendingPackageName}. Berlaku setelah tagihan berikutnya dibayar.
        </p>
      ) : null}
      {cancellationScheduled ? (
        <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-400/[0.06] px-3 py-2.5 text-sm text-amber-100">
          Layanan tetap aktif sampai {formatDate(customer.expiredDate)}. Pengingat tagihan berikutnya dihentikan.
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-2">
        <Detail label="Biaya bulanan" value={formatRupiah(customer.monthlyFee)} />
        <Detail label="Kecepatan" value={customer.bandwidthLimit || "Sesuai paket"} />
        <Detail label="Masa layanan sampai" value={formatDate(customer.expiredDate)} />
        <Detail label="Tanggal tagihan" value={customer.billingDate ? `Tanggal ${customer.billingDate}` : "Belum tersedia"} />
      </div>
      {typeof customer.dataLimitMb === "number" && customer.dataLimitMb > 0 ? (
        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-slate-950/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Kuota periode berjalan</p>
              <p className="mt-1 text-xs text-slate-500">
                Terpakai {formatBytes(customer.dataUsedBytes || 0)} dari {formatBytes(customer.dataLimitMb * 1024 * 1024)}
              </p>
            </div>
            <span className="text-right text-sm font-semibold text-emerald-200">
              Sisa {formatBytes(customer.dataRemainingBytes || 0)}
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]"
            role="progressbar"
            aria-label="Pemakaian kuota periode berjalan"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, ((customer.dataUsedBytes || 0) / (customer.dataLimitMb * 1024 * 1024)) * 100)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
              style={{
                width: `${Math.min(100, ((customer.dataUsedBytes || 0) / (customer.dataLimitMb * 1024 * 1024)) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Pemakaian merupakan estimasi dari pencatatan berkala
            {customer.dataUsageSampledAt ? `, terakhir diperbarui ${formatDateTime(customer.dataUsageSampledAt)}.` : "."}
            {" "}Sesi singkat atau koneksi terputus dapat tidak tercatat.
          </p>
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onUpgrade}
          disabled={!canManage || cancellationScheduled || upgradePackages.length === 0}
          className={buttonClass}
        >
          Upgrade saat jatuh tempo
        </button>
        {whatsappLink ? (
          <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
            Tanya CS untuk perubahan manual
          </a>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          disabled={!canManage || cancellationScheduled || customer.status === "disabled"}
          className="rounded-xl border border-rose-400/20 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Berhenti berlangganan
        </button>
      </div>
    </section>
  );
}

function CustomerDetails({ customer }: { customer: PortalCustomer }) {
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
      <h2 className="font-semibold text-white">Detail pelanggan</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Detail label="ID pelanggan" value={customer.customerId} />
        <Detail label="Nama" value={customer.name} />
        <Detail label="Nomor WhatsApp" value={customer.phone || "Belum tersedia"} />
        <Detail label="Username layanan" value={customer.pppoeUsername || "Belum tersedia"} />
        {customer.address ? <Detail label="Alamat" value={customer.address} /> : null}
      </div>
    </section>
  );
}

function InvoiceList({
  invoices,
  onPay,
}: {
  invoices: PortalInvoice[];
  onPay: (invoice: PortalInvoice) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pembayaran</p>
          <h2 className="mt-1 text-xl font-bold text-white">Tagihan terbaru</h2>
        </div>
        <CreditCard className="h-5 w-5 text-indigo-200" />
      </div>
      {invoices.length ? (
        <div className="mt-4 divide-y divide-white/[0.07]">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {invoice.profileName} · Jatuh tempo {formatDate(invoice.dueDate)}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">{formatRupiah(invoice.totalAmount)}</p>
              </div>
              {invoice.status === "unpaid" ? (
                <button type="button" onClick={() => onPay(invoice)} className={`${buttonClass} shrink-0`}>
                  Bayar tagihan
                </button>
              ) : (
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${invoice.status === "paid" ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
                  {invoice.status === "paid" ? "Lunas" : invoice.status === "expired" ? "Kedaluwarsa" : "Dibatalkan"}
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-white/[0.1] p-5 text-center text-sm text-slate-400">
          Belum ada tagihan yang ditampilkan.
        </p>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-200">{value || "Belum tersedia"}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      className="portal-theme fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="portal-dialog-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="portal-dialog-title" className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.07] hover:text-white">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

export function PaymentDialog({
  invoice,
  onClose,
  portalToken,
}: {
  invoice: PortalInvoice;
  onClose: () => void;
  portalToken?: string;
}) {
  const [options, setOptions] = useState<PaymentOptionsResponse | null>(null);
  const [paymentMode, setPaymentMode] = useState<"automatic" | "manual">("automatic");
  const [methodId, setMethodId] = useState("");
  const [result, setResult] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/portal/payment-options", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Metode pembayaran belum tersedia.";
          throw new Error(message);
        }
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("manualMethods" in payload) ||
          !Array.isArray(payload.manualMethods)
        ) {
          throw new Error("Daftar metode pembayaran tidak valid.");
        }
        const paymentOptions = payload as PaymentOptionsResponse;
        if (!active) return;
        setOptions(paymentOptions);
        setPaymentMode(paymentOptions.automaticAvailable ? "automatic" : "manual");
        setMethodId(paymentOptions.manualMethods[0]?.id || "");
      })
      .catch((fetchError: unknown) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : "Metode pembayaran belum tersedia.");
      });
    return () => {
      active = false;
    };
  }, []);

  const submitPayment = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/portal/pay-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          paymentMode,
          ...(portalToken ? { portalToken } : {}),
          ...(paymentMode === "manual" ? { methodId } : {}),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Pembayaran belum dapat diproses.";
        throw new Error(message);
      }
      if (typeof payload !== "object" || payload === null) throw new Error("Respons pembayaran tidak valid.");
      const payment = payload as PaymentResponse;
      setResult(payment);
      if (payment.redirectUrl) window.location.assign(payment.redirectUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Pembayaran belum dapat diproses.");
    } finally {
      setBusy(false);
    }
  };

  const selectedMethod: ManualPaymentMethod | undefined =
    options?.manualMethods.find((method) => method.id === methodId);

  return (
    <Modal title="Pembayaran tagihan" onClose={onClose}>
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4">
        <p className="text-sm font-medium text-slate-200">{invoice.invoiceNumber}</p>
        <p className="mt-1 text-xl font-bold text-white">{formatRupiah(invoice.totalAmount)}</p>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-3 text-sm text-rose-100">{error}</p> : null}
      {!options && !error ? <p className="mt-4 text-sm text-slate-400">Memuat metode pembayaran...</p> : null}
      {options ? (
        <>
          <fieldset className="mt-5 space-y-3">
            <legend className="text-sm font-medium text-slate-200">Pilih metode pembayaran</legend>
            {options.automaticAvailable ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3">
                <input type="radio" name="payment-mode" value="automatic" checked={paymentMode === "automatic"} onChange={() => setPaymentMode("automatic")} className="mt-1 accent-indigo-400" />
                <span><span className="block text-sm font-medium text-white">Pembayaran otomatis</span><span className="mt-1 block text-xs text-slate-400">Ikuti instruksi pembayaran dari gateway yang tersedia.</span></span>
              </label>
            ) : null}
            {options.manualMethods.map((method) => (
              <label key={method.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3">
                <input type="radio" name="payment-mode" value={`manual:${method.id}`} checked={paymentMode === "manual" && methodId === method.id} onChange={() => { setPaymentMode("manual"); setMethodId(method.id); }} className="mt-1 accent-indigo-400" />
                <span><span className="block text-sm font-medium text-white">{method.name}</span><span className="mt-1 block text-xs text-slate-400">{method.accountNumber ? `${method.accountNumber}${method.accountHolder ? ` · ${method.accountHolder}` : ""}` : method.instructions}</span></span>
              </label>
            ))}
          </fieldset>
          {paymentMode === "manual" && selectedMethod ? (
            <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-100">
              {selectedMethod.instructions}
            </p>
          ) : null}
          {!options.automaticAvailable && options.manualMethods.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Metode pembayaran sedang tidak tersedia. Silakan hubungi Customer Service.</p>
          ) : null}
          {result ? (
            <div role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-100">
              {result.message || "Permintaan pembayaran berhasil dibuat."}
              {result.operatorUrl ? <a href={result.operatorUrl} target="_blank" rel="noreferrer" className="mt-2 block font-semibold underline underline-offset-4">Kirim bukti / hubungi operator</a> : null}
              {result.expiresAtFormatted ? <p className="mt-2 text-xs">Berlaku sampai {result.expiresAtFormatted}</p> : null}
            </div>
          ) : null}
          {!result && (options.automaticAvailable || options.manualMethods.length > 0) ? (
            <button type="button" disabled={busy || (paymentMode === "manual" && !methodId)} onClick={() => void submitPayment()} className={`${buttonClass} mt-5 w-full`}>
              {busy ? "Menyiapkan pembayaran..." : "Lanjutkan pembayaran"}
            </button>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
