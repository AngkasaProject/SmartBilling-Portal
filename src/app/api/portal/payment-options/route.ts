import { NextResponse } from "next/server";
import { billingApiFetch, type PaymentOptionsResponse } from "@/lib/billing-api";

export async function GET(): Promise<NextResponse> {
  try {
    const options = await billingApiFetch<PaymentOptionsResponse>("/api/portal/payment-options");
    return NextResponse.json(options, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Server tidak tersedia" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
