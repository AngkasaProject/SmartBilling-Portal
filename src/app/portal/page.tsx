import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getPortalServerStatus } from "@/lib/billing-api";
import { PortalExperience } from "./portal-experience";

export const metadata: Metadata = {
  title: "Portal Pelanggan",
  description: "Kelola layanan internet dan tagihan Anda.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Portal Pelanggan | SmartBilling",
    description:
      "Periksa status layanan, kuota, dan tagihan internet Anda di Portal Pelanggan SmartBilling.",
    type: "website",
    locale: "id_ID",
    siteName: "SmartBilling Portal",
    url: "/portal",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Portal Pelanggan SmartBilling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal Pelanggan | SmartBilling",
    description:
      "Periksa status layanan, kuota, dan tagihan internet Anda di Portal Pelanggan SmartBilling.",
    images: ["/opengraph-image"],
  },
};

export default async function PortalPage() {
  const [session, status] = await Promise.all([
    getSession(),
    getPortalServerStatus(),
  ]);

  return (
    <PortalExperience
      initialSession={session ? { name: session.name, phone: session.phone } : null}
      initialStatus={status}
    />
  );
}
