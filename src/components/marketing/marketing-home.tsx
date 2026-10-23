"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Wifi,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  PortalPublicStatus,
  PublicHotspotProfile,
  PublicPppoePackage,
} from "@/lib/billing-api";
import { BillingConnectionStatus } from "@/components/marketing/billing-connection-status";
import { VoucherPurchaseButton } from "@/components/marketing/voucher-purchase-button";

interface MarketingHomeProps {
  profiles: PublicHotspotProfile[];
  pppoePackages: PublicPppoePackage[];
  error?: string;
  initialStatus: PortalPublicStatus;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const features = [
  {
    icon: Zap,
    title: "Aktivasi Instan",
    desc: "Pilih paket dan langsung aktif.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Pembayaran Aman",
    desc: "Didukung payment gateway terpercaya.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Headphones,
    title: "Dukungan 24/7",
    desc: "Tim CS siap membantu Anda.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
];

const slides = [
  { label: "Beranda", ariaLabel: "Beranda" },
  { label: "Voucher Hotspot", ariaLabel: "Voucher hotspot" },
  { label: "Internet Bulanan", ariaLabel: "Internet bulanan" },
];

export function MarketingHome({
  profiles,
  pppoePackages,
  error,
  initialStatus,
}: MarketingHomeProps) {
  const router = useRouter();
  const [billingConnected, setBillingConnected] = useState(
    initialStatus.connected,
  );
  const previousConnection = useRef(initialStatus.connected);
  const [activeSlide, setActiveSlide] = useState(0);
  const stageRef = useRef<HTMLElement>(null);
  const activeSlideRef = useRef(0);
  const slideLockedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (billingConnected && !previousConnection.current) router.refresh();
    previousConnection.current = billingConnected;
  }, [billingConnected, router]);

  const brandName =
    initialStatus.companyName?.trim() ||
    initialStatus.brandName?.trim() ||
    initialStatus.appName?.trim() ||
    "SmartBilling";
  const whatsappNumber =
    initialStatus.operatorWhatsapp?.replace(/\D/g, "") || "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Halo CS, saya ingin konsultasi tentang pilihan paket internet dan layanan " + brandName + ".")}`
    : "";

  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const changeSlide = (direction: number) => {
      if (slideLockedRef.current) return;
      const nextSlide = Math.max(
        0,
        Math.min(slides.length - 1, activeSlideRef.current + direction),
      );
      if (nextSlide === activeSlideRef.current) return;
      slideLockedRef.current = true;
      activeSlideRef.current = nextSlide;
      setActiveSlide(nextSlide);
      window.setTimeout(() => {
        slideLockedRef.current = false;
      }, 700);
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 24) return;
      const panel = stage.querySelector<HTMLElement>(
        `#portal-slide-${activeSlideRef.current}`,
      );
      if (panel) {
        const atTop = panel.scrollTop <= 0;
        const atBottom =
          panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
        if (
          panel.scrollHeight > panel.clientHeight &&
          ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop))
        ) {
          return;
        }
      }
      event.preventDefault();
      changeSlide(event.deltaY > 0 ? 1 : -1);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  const changeSlide = (nextSlide: number) => {
    const index = Math.max(0, Math.min(slides.length - 1, nextSlide));
    activeSlideRef.current = index;
    setActiveSlide(index);
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const startY = touchStartRef.current;
    touchStartRef.current = null;
    if (startY === null) return;
    const endY = event.changedTouches[0]?.clientY;
    if (endY === undefined) return;
    const deltaY = startY - endY;
    if (Math.abs(deltaY) < 70 || slideLockedRef.current) return;
    const panel = event.currentTarget.querySelector<HTMLElement>(
      `#portal-slide-${activeSlideRef.current}`,
    );
    if (panel) {
      const atTop = panel.scrollTop <= 0;
      const atBottom =
        panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
      if (
        panel.scrollHeight > panel.clientHeight &&
        ((deltaY > 0 && !atBottom) || (deltaY < 0 && !atTop))
      ) {
        return;
      }
    }
    const nextSlide = Math.max(
      0,
      Math.min(
        slides.length - 1,
        activeSlideRef.current + (deltaY > 0 ? 1 : -1),
      ),
    );
    if (nextSlide === activeSlideRef.current) return;
    slideLockedRef.current = true;
    changeSlide(nextSlide);
    window.setTimeout(() => {
      slideLockedRef.current = false;
    }, 700);
  };

  return (
    <div className="flex h-dvh min-h-[560px] flex-col overflow-hidden overflow-x-hidden bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500/30">
      {/* === HEADER (Rapi 2 Baris) === */}
      <header className="z-30 shrink-0 border-b border-white/5 bg-zinc-950/80 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-6xl px-5">
          {/* Baris 1: Logo & Tombol Kanan */}
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-emerald-500 shadow-lg shadow-indigo-500/20 transition duration-300 group-hover:scale-105">
                <span className="absolute inset-0 rounded-2xl bg-white/10" />
                <Wifi
                  className="relative h-4 w-4 text-white"
                  strokeWidth={2.5}
                />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">
                {brandName}
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <BillingConnectionStatus
                initialStatus={initialStatus}
                compact
                onStatusChange={setBillingConnected}
              />

              <div className="hidden h-5 w-px bg-white/10 sm:block"></div>

              <div className="hidden items-center gap-1 sm:flex">
                <button
                  type="button"
                  onClick={() => changeSlide(activeSlide - 1)}
                  disabled={activeSlide === 0}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => changeSlide(activeSlide + 1)}
                  disabled={activeSlide === slides.length - 1}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <Link
                href="/portal"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black shadow-sm transition-all hover:bg-zinc-200 active:scale-95"
              >
                <UserRound className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                <span className="hidden sm:inline">Portal Pelanggan</span>
                <span className="sm:hidden">Masuk</span>
              </Link>
            </div>
          </div>

          {/* Baris 2: Tab Menu (Segmented Control) */}
          <div className="flex w-full justify-center pb-3 pt-1">
            <div
              role="tablist"
              className="flex w-full max-w-md items-center gap-1 overflow-x-auto rounded-full bg-white/5 p-1 border border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.label}
                  type="button"
                  role="tab"
                  aria-selected={activeSlide === index}
                  onClick={() => changeSlide(index)}
                  className={`flex-1 shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                    activeSlide === index
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {slide.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-pan-y"
        onTouchStart={(event) => {
          touchStartRef.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={handleTouchEnd}
      >
        {!billingConnected ? (
          <div
            role="alert"
            className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 border-b border-rose-500/20 bg-rose-500/10 px-5 py-2.5 text-center text-xs font-medium text-rose-200 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
            </span>
            Server sedang tidak terhubung. Beberapa fitur mungkin tidak
            tersedia.
          </div>
        ) : null}

        {/* --- SLIDE 0: HERO & FEATURES --- */}
        <section
          id="portal-slide-0"
          hidden={activeSlide !== 0}
          className={`absolute inset-0 overflow-y-auto overscroll-contain transition duration-500 ease-out ${
            activeSlide === 0
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-8 opacity-0"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="pointer-events-none absolute -right-40 -top-36 -z-10 h-96 w-96 animate-pulse rounded-full bg-emerald-500/10 blur-[120px] duration-10000" />
          <div className="pointer-events-none absolute -left-40 -top-24 -z-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

          <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center px-5 py-12 sm:py-20">
            <div className="text-center">
              <p className="mb-8 inline-flex animate-[fadeInUp_0.5s_ease-out] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-xl">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                </span>
                Internet rumah & hotspot untuk keseharian
              </p>

              <h1 className="mx-auto max-w-4xl animate-[fadeInUp_0.6s_ease-out_0.1s_both] text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-white sm:text-6xl">
                Internet andal untuk
                <span className="mt-2 block bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent sm:mt-3">
                  setiap kebutuhan
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl animate-[fadeInUp_0.6s_ease-out_0.2s_both] text-[15px] leading-relaxed text-zinc-400 sm:text-base">
                Tetap produktif, belajar lebih nyaman, dan nikmati waktu bersama
                keluarga dengan pilihan internet yang sesuai kebutuhan Anda.
              </p>

              <div className="mt-10 flex animate-[fadeInUp_0.6s_ease-out_0.3s_both] flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => changeSlide(1)}
                  className="group inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 active:scale-[0.98]"
                >
                  Lihat Pilihan Paket
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-zinc-100 backdrop-blur-md transition hover:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Hubungi CS
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-16 grid animate-[fadeInUp_0.6s_ease-out_0.4s_both] gap-4 sm:grid-cols-3 sm:mt-20">
              {features.map(({ icon: Icon, title, desc, color, bg }) => (
                <div
                  key={title}
                  className="group flex items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-xl"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bg} ${color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SLIDE 1: VOUCHER --- */}
        <section
          id="portal-slide-1"
          hidden={activeSlide !== 1}
          className={`absolute inset-0 overflow-y-auto overscroll-contain border-y border-white/5 bg-zinc-950 transition duration-500 ease-out ${
            activeSlide === 1
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                  Pilihan untuk Anda
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Paket hotspot tersedia
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                  Bandingkan kecepatan, masa aktif, dan harga untuk menemukan
                  paket yang paling sesuai.
                </p>
              </div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-400">
                {profiles.length
                  ? `${profiles.length} paket tersedia`
                  : "Paket diperbarui oleh operator"}
              </p>
            </div>

            {error ? (
              <div
                role="status"
                className="mt-8 flex flex-col gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>{error}</p>
                <Button type="button" variant="outline" onClick={() => router.refresh()} className="border-rose-300/25 bg-transparent text-rose-100 hover:bg-rose-400/10">
                  Coba muat ulang
                </Button>
              </div>
            ) : profiles.length ? (
              <div
                className={`mt-8 grid gap-5 ${profiles.length === 1 ? "mx-auto max-w-lg" : "sm:grid-cols-2 lg:grid-cols-3"}`}
              >
                {profiles.map((profile, index) => (
                  <Card
                    key={profile.id}
                    className="group flex min-h-[320px] flex-col rounded-3xl border-white/10 bg-white/[0.02] p-6 text-white shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-indigo-500/10 animate-[fadeInUp_0.5s_ease-out_both]"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-white">
                          {profile.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-indigo-400">
                          Paket Hotspot
                        </p>
                      </div>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/20 to-emerald-500/10 shadow-inner">
                        <Wifi className="h-5 w-5 text-indigo-300" />
                      </span>
                    </div>
                    <p className="mt-6 text-3xl font-bold tracking-tight text-white">
                      {formatRupiah(profile.price)}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/5 pt-6 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          Kecepatan
                        </span>
                        <span className="font-medium text-zinc-200">
                          {profile.speedLimit || "Sesuai paket"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          <Clock3 className="h-3 w-3" /> Masa aktif
                        </span>
                        <span className="font-medium text-zinc-200">
                          {profile.validityDuration ||
                            `${profile.validityHours} jam`}
                        </span>
                      </div>
                      {profile.dataLimitMb ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Kuota
                          </span>
                          <span className="font-medium text-zinc-200">
                            {profile.dataLimitMb >= 1024
                              ? `${Number((profile.dataLimitMb / 1024).toFixed(2))} GB`
                              : `${profile.dataLimitMb} MB`}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          Perangkat
                        </span>
                        <span className="font-medium text-zinc-200">
                          {profile.sharedUsers || 1} perangkat
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto pt-6">
                      <VoucherPurchaseButton
                        profile={profile}
                        disabled={!billingConnected}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] px-6 py-16 text-center">
                <Wifi className="mx-auto h-10 w-10 text-zinc-600" />
                <h3 className="mt-4 text-base font-semibold text-white">
                  Belum ada paket yang ditampilkan
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                  Silakan cek kembali nanti atau hubungi operator untuk
                  mengetahui pilihan paket terbaru.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* --- SLIDE 2: PPPoE --- */}
        <section
          id="portal-slide-2"
          hidden={activeSlide !== 2}
          className={`absolute inset-0 overflow-y-auto overscroll-contain border-b border-white/5 bg-zinc-950 transition duration-500 ease-out ${
            activeSlide === 2
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Untuk rumah dan usaha
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Paket internet bulanan
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                Layanan PPPoE bulanan diproses dengan bantuan Customer Service.
                Hubungi operator untuk berlangganan atau memilih paket.
              </p>
            </div>
            {pppoePackages.length ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {pppoePackages.map((plan, index) => (
                  <Card
                    key={plan.id}
                    className="group flex flex-col rounded-3xl border-white/10 bg-white/[0.02] p-6 text-white shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-emerald-500/10 animate-[fadeInUp_0.5s_ease-out_both]"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <p className="text-lg font-semibold text-white">
                      {plan.name}
                    </p>
                    <p className="mt-5 text-3xl font-bold text-white">
                      {formatRupiah(plan.monthlyFee)}
                      <span className="text-sm font-normal text-zinc-400">
                        {" "}
                        / bulan
                      </span>
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5 text-sm">
                      <span className="text-zinc-400">Kecepatan</span>
                      <span className="font-semibold text-zinc-200">
                        {plan.speedLimit || "Sesuai paket"}
                      </span>
                    </div>
                    {plan.dataLimitMb ? (
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Kuota bulanan</span>
                        <span className="font-semibold text-zinc-200">
                          {plan.dataLimitMb >= 1024
                            ? `${(plan.dataLimitMb / 1024).toFixed(1)} GB`
                            : `${plan.dataLimitMb} MB`}
                        </span>
                      </div>
                    ) : null}
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!billingConnected}
                        onClick={(event) => {
                          if (!billingConnected) event.preventDefault();
                        }}
                        className={`mt-8 inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          billingConnected
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 group-hover:border-emerald-500/50"
                            : "pointer-events-none border-white/10 text-zinc-500"
                        }`}
                      >
                        Tanya CS via WhatsApp
                      </a>
                    ) : (
                      <p className="mt-8 text-xs text-zinc-500">
                        Informasi kontak CS belum tersedia.
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-zinc-400">
                Paket internet bulanan belum tersedia. Hubungi Customer Service
                untuk informasi.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
