import { NextResponse } from "next/server";
import { getPortalServerStatus } from "@/lib/billing-api";

export async function GET(): Promise<NextResponse> {
  const status = await getPortalServerStatus();
  return NextResponse.json(status, {
    status: status.connected ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
