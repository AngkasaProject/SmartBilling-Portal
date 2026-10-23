import { createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { BillingApiError, lookupPortalBilling } from "@/lib/billing-api";
import { generateOTP } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rate-limit";

const SEND_WINDOW_MS = 10 * 60 * 1000;

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

function getBillingBaseUrl(): string {
  const baseUrl = process.env.BILLING_API_URL;
  if (!baseUrl) throw new Error("BILLING_API_URL is not configured");
  return baseUrl;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("phone" in body)) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  const phone = getPhone(body.phone);
  if (!phone) {
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

  const ipLimit = checkRateLimit(
    `otp-send:ip:${getClientIp(request)}`,
    5,
    SEND_WINDOW_MS,
  );
  const phoneLimit = checkRateLimit(`otp-send:phone:${phone}`, 3, SEND_WINDOW_MS);
  if (!ipLimit.allowed || !phoneLimit.allowed) {
    const retryAfter = Math.max(
      ipLimit.allowed ? 0 : ipLimit.retryAfterSeconds,
      phoneLimit.allowed ? 0 : phoneLimit.retryAfterSeconds,
    );
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    try {
      await lookupPortalBilling(phone);
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

    const { code, verificationToken } = generateOTP(phone);
    const sessionSecret = process.env.PORTAL_SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error("PORTAL_SESSION_SECRET is not configured");
    }
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString("base64url");
    const signature = createHmac("sha256", sessionSecret)
      .update(`${timestamp}.${nonce}.${phone}.${code}.${verificationToken}`)
      .digest("base64url");
    const url = new URL("/api/internal/portal/send-otp", getBillingBaseUrl());
    const deliveryResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Portal-OTP-Timestamp": timestamp,
        "X-Portal-OTP-Nonce": nonce,
        "X-Portal-OTP-Signature": signature,
      },
      body: JSON.stringify({ phone, code, verificationToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!deliveryResponse.ok) {
      return NextResponse.json(
        { error: "Kode verifikasi belum dapat dikirim. Coba lagi nanti." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, verificationToken });
  } catch {
    return NextResponse.json(
      { error: "Kode verifikasi belum dapat dikirim. Coba lagi nanti." },
      { status: 502 },
    );
  }
}
