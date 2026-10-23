import { NextResponse } from "next/server";
import { BillingApiError, getPublicPppoePackages } from "@/lib/billing-api";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getPublicPppoePackages();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof BillingApiError ? error.status : 502;
    return NextResponse.json(
      { error: "Paket bulanan dari Billing tidak tersedia" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
