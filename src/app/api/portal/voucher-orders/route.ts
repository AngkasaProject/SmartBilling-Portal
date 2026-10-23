import { NextRequest, NextResponse } from "next/server";
import {
  BillingApiError,
  createVoucherOrder,
  type VoucherOrderResponse,
} from "@/lib/billing-api";

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
  const { profileId, customerName, phone, email, paymentMode, methodId } = body;
  if (
    typeof profileId !== "string" || !profileId ||
    typeof customerName !== "string" || customerName.trim().length < 2 || customerName.length > 100 ||
    typeof phone !== "string" || phone.replace(/\D/g, "").length < 8 || phone.length > 32 ||
    (email !== undefined && (typeof email !== "string" || email.length > 254)) ||
    (paymentMode !== "automatic" && paymentMode !== "manual") ||
    (methodId !== undefined && (typeof methodId !== "string" || methodId.length > 128))
  ) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  try {
    const result = await createVoucherOrder({
      profileId,
      customerName: customerName.trim(),
      phone,
      ...(typeof email === "string" && email.trim() ? { email: email.trim() } : {}),
      paymentMode,
      ...(typeof methodId === "string" ? { methodId } : {}),
    });
    return NextResponse.json(result satisfies VoucherOrderResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof BillingApiError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pembelian belum dapat diproses" },
      { status },
    );
  }
}
