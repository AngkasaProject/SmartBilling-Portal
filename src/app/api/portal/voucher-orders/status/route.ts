import { NextRequest, NextResponse } from "next/server";
import {
  BillingApiError,
  getVoucherOrderStatus,
} from "@/lib/billing-api";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("orderId" in body) ||
    !("phone" in body) ||
    typeof body.orderId !== "string" ||
    typeof body.phone !== "string"
  ) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  try {
    const result = await getVoucherOrderStatus({
      orderId: body.orderId,
      phone: body.phone,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof BillingApiError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status pesanan tidak tersedia" },
      { status },
    );
  }
}
