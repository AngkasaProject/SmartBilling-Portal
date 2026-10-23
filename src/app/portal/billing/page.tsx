import type { Metadata } from "next";
import { getPortalServerStatus } from "@/lib/billing-api";
import { BillingLinkView } from "./billing-link-view";

export const metadata: Metadata = {
  title: "Detail Tagihan",
  description: "Lihat detail dan lakukan pembayaran tagihan layanan.",
  robots: { index: false, follow: false },
};

export default async function BillingLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [{ token }, status] = await Promise.all([
    searchParams,
    getPortalServerStatus(),
  ]);
  return (
    <BillingLinkView
      token={typeof token === "string" ? token : ""}
      initialStatus={status}
    />
  );
}
