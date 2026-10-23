import { NextRequest, NextResponse } from "next/server";
import {
  BillingApiError,
  createPortalPayment,
  type PaymentRequest,
} from "@/lib/billing-api";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("invoiceId" in body) ||
    typeof body.invoiceId !== "string" ||
    !body.invoiceId ||
    !("paymentMode" in body) ||
    (body.paymentMode !== "automatic" && body.paymentMode !== "manual") ||
    ("methodId" in body && typeof body.methodId !== "string") ||
    ("portalToken" in body &&
      (typeof body.portalToken !== "string" || !body.portalToken || body.portalToken.length > 4096))
  ) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  const portalToken =
    "portalToken" in body && typeof body.portalToken === "string"
      ? body.portalToken
      : undefined;
  if (!session && !portalToken) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
  }
  const paymentRequest: PaymentRequest = {
    invoiceId: body.invoiceId,
    paymentMode: body.paymentMode,
    ...(session ? { lookupValue: session.phone } : { portalToken }),
    ...("methodId" in body && typeof body.methodId === "string"
      ? { methodId: body.methodId }
      : {}),
  };
  try {
    const result = await createPortalPayment(paymentRequest);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof BillingApiError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pembayaran belum dapat diproses" },
      { status },
    );
  }
}
