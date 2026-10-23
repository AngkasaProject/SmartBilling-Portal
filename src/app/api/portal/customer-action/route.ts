import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { billingInternalPost } from "@/lib/billing-internal";

interface CustomerActionResponse {
  ok: boolean;
  action: string;
  packageName?: string;
  monthlyFee?: number;
  effectiveDate: string;
  effectiveWhen?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  const action = body.action;
  const packageId = "packageId" in body ? body.packageId : undefined;
  if (
    action !== "schedule-upgrade" &&
    action !== "cancel-subscription"
  ) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (action === "schedule-upgrade" && (typeof packageId !== "string" || !packageId)) {
    return NextResponse.json({ error: "Pilih paket yang tersedia" }, { status: 400 });
  }

  try {
    const result = await billingInternalPost<CustomerActionResponse>(
      "/api/internal/portal/customer-action",
      {
        customerId: session.customerId,
        action,
        ...(typeof packageId === "string" ? { packageId } : {}),
      },
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan tidak dapat diproses";
    return NextResponse.json(
      { error: message },
      { status: message.includes("sedang diproses") ? 409 : 502 },
    );
  }
}
