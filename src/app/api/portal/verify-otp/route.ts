import { NextRequest, NextResponse } from "next/server";
import {
  BillingApiError,
  lookupPortalBilling,
} from "@/lib/billing-api";
import {
  PORTAL_SESSION_COOKIE_NAME,
  signSession,
} from "@/lib/auth";
import { billingInternalPost } from "@/lib/billing-internal";
import { checkRateLimit } from "@/lib/rate-limit";

const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  return (ip || request.headers.get("x-real-ip") || "unknown").slice(0, 128);
}

function getPhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 32) return null;
  const phone = value.replace(/\D/g, "");
  return phone.length >= 8 && phone.length <= 15 ? phone : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const phone = getPhone(body.phone);
  const code = body.code;
  const verificationToken = body.verificationToken;
  if (
    !phone ||
    typeof code !== "string" ||
    !/^\d{6}$/.test(code) ||
    typeof verificationToken !== "string" ||
    verificationToken.length !== 43
  ) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (!process.env.PORTAL_SESSION_SECRET) {
    return NextResponse.json(
      { error: "Autentikasi portal belum dikonfigurasi" },
      { status: 500 },
    );
  }
  if (!process.env.BILLING_API_URL) {
    return NextResponse.json(
      { error: "Layanan billing tidak tersedia" },
      { status: 502 },
    );
  }

  const rateLimit = checkRateLimit(
    `otp-verify:ip:${getClientIp(request)}`,
    5,
    VERIFY_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let otpResult: { valid: boolean };
  try {
    otpResult = await billingInternalPost<{ valid: boolean }>(
      "/api/internal/portal/verify-otp",
      { phone, code, verificationToken },
    );
  } catch {
    return NextResponse.json(
      { error: "Layanan verifikasi tidak tersedia. Coba lagi." },
      { status: 502 },
    );
  }
  if (!otpResult.valid) {
    return NextResponse.json(
      { error: "Kode salah atau kedaluwarsa" },
      { status: 401 },
    );
  }

  try {
    const billing = await lookupPortalBilling(phone);
    const customer = billing.customer;
    if (
      typeof customer.id !== "string" ||
      !customer.id ||
      typeof customer.name !== "string" ||
      !customer.name
    ) {
      return NextResponse.json(
        { error: "Nomor WhatsApp belum terdaftar sebagai pelanggan." },
        { status: 404 },
      );
    }

    const sessionValue = signSession({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone || phone,
      exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(PORTAL_SESSION_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof BillingApiError && error.status === 404) {
      return NextResponse.json(
        { error: "Nomor WhatsApp belum terdaftar sebagai pelanggan." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Layanan billing tidak tersedia" },
      { status: 502 },
    );
  }
}
