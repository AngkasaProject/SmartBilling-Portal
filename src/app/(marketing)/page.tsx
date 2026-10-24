import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/marketing-home";
import {
  getPortalServerStatus,
  getPublicHotspotProfiles,
  getPublicPppoePackages,
} from "@/lib/billing-api";

export const metadata: Metadata = {
  title: "Internet Cepat & Paket Hotspot",
  description:
    "Temukan paket internet dan voucher hotspot yang sesuai. Lihat pilihan paket, masa aktif, dan harga dari SmartBilling.",
  keywords: [
    "paket internet",
    "voucher hotspot",
    "internet cepat",
    "SmartBilling",
  ],
  openGraph: {
    title: "Paket Internet & Hotspot | SmartBilling",
    description:
      "Pilih paket internet dan voucher hotspot yang sesuai dengan kebutuhan Anda.",
    type: "website",
    locale: "id_ID",
    siteName: "SmartBilling Portal",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Pilihan paket internet dan voucher hotspot SmartBilling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paket Internet & Hotspot | SmartBilling",
    description:
      "Pilih paket internet dan voucher hotspot yang sesuai dengan kebutuhan Anda.",
    images: ["/opengraph-image"],
  },
};

export const dynamic = "force-dynamic";

async function getPublicPackages(): Promise<{
  profiles: Awaited<ReturnType<typeof getPublicHotspotProfiles>>["profiles"];
  pppoePackages: Awaited<ReturnType<typeof getPublicPppoePackages>>["packages"];
  error?: string;
}> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const [voucherPayload, pppoePayload] = await Promise.all([
        getPublicHotspotProfiles(),
        getPublicPppoePackages(),
      ]);
      if (!Array.isArray(voucherPayload.profiles) || !Array.isArray(pppoePayload.packages)) {
        throw new Error("Format daftar paket dari SmartBilling tidak valid.");
      }
      return {
        profiles: voucherPayload.profiles,
        pppoePackages: pppoePayload.packages,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }
  console.error("Failed to load public packages from the server after retry:", lastError);
  return {
    profiles: [],
    pppoePackages: [],
    error: "Daftar paket belum dapat dimuat. Silakan coba kembali nanti.",
  };
}

export default async function MarketingPage() {
  const [{ profiles, pppoePackages, error }, status] = await Promise.all([
    getPublicPackages(),
    getPortalServerStatus(),
  ]);
  return (
    <MarketingHome
      profiles={profiles}
      pppoePackages={pppoePackages}
      error={error}
      initialStatus={status}
    />
  );
}
