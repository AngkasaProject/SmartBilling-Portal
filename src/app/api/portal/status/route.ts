import { NextResponse } from "next/server";
import type { PortalPublicStatus } from "@/lib/billing-api";
import { billingApiFetch } from "@/lib/billing-api";

export async function GET(): Promise<NextResponse> {
  try {
    const status = await billingApiFetch<PortalPublicStatus>("/api/portal/status");
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        error: "Server Billing sedang tidak terhubung. Login dan pembelian sementara tidak tersedia.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
