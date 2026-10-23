import { NextRequest, NextResponse } from "next/server";
import {
  BillingApiError,
  getPortalBillingByToken,
  type BillingLinkResponse,
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
    !("token" in body) ||
    typeof body.token !== "string" ||
    !body.token ||
    body.token.length > 4096
  ) {
    return NextResponse.json({ error: "Tautan tagihan tidak valid" }, { status: 400 });
  }

  try {
    const result: BillingLinkResponse = await getPortalBillingByToken(body.token);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof BillingApiError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tagihan tidak tersedia" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
