import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { billingInternalPost } from "@/lib/billing-internal";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
  }
  try {
    const dashboard = await billingInternalPost<Record<string, unknown>>(
      "/api/internal/portal/customer",
      { customerId: session.customerId },
    );
    return NextResponse.json(dashboard, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Data pelanggan tidak tersedia" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
