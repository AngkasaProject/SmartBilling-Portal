import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/marketing-home";
import type {
  PortalPublicStatus,
  PublicHotspotProfile,
  PublicPppoePackage,
  VoucherProfilesResponse,
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
  },
  twitter: {
    card: "summary",
    title: "Paket Internet & Hotspot | SmartBilling",
    description:
      "Pilih paket internet dan voucher hotspot yang sesuai dengan kebutuhan Anda.",
  },
};

const getBillingApiBase = () =>
  process.env.BILLING_API_URL || process.env.NEXT_PUBLIC_BILLING_API_URL;

async function getPublicPackages(): Promise<{
  profiles: PublicHotspotProfile[];
  pppoePackages: PublicPppoePackage[];
  error?: string;
}> {
  const baseUrl = getBillingApiBase();
  if (!baseUrl) {
    return {
      profiles: [],
      pppoePackages: [],
      error: "Server Billing belum terhubung. Login dan pembelian sementara tidak tersedia.",
    };
  }

  try {
    const [voucherResponse, pppoeResponse] = await Promise.all([
      fetch(new URL("/api/portal/vouchers", baseUrl), { next: { revalidate: 300 } }),
      fetch(new URL("/api/portal/pppoe-packages", baseUrl), { next: { revalidate: 300 } }),
    ]);
    if (!voucherResponse.ok || !pppoeResponse.ok) {
      throw new Error(`SmartBilling API returned HTTP ${Math.max(voucherResponse.status, pppoeResponse.status)}`);
    }
    const [voucherPayload, pppoePayload]: [VoucherProfilesResponse, { packages: PublicPppoePackage[] }] =
      await Promise.all([voucherResponse.json(), pppoeResponse.json()]);
    if (!Array.isArray(voucherPayload.profiles) || !Array.isArray(pppoePayload.packages)) {
      throw new Error("Format daftar paket dari SmartBilling tidak valid.");
    }

    return {
      profiles: voucherPayload.profiles,
      pppoePackages: pppoePayload.packages,
    };
  } catch (error) {
    console.error("Failed to load public hotspot packages:", error);
    return {
      profiles: [],
      pppoePackages: [],
      error: "Daftar paket belum dapat dimuat. Silakan coba kembali nanti.",
    };
  }
}

async function getPublicStatus(): Promise<PortalPublicStatus> {
  const baseUrl = getBillingApiBase();
  if (!baseUrl) return { connected: false };
  try {
    const response = await fetch(new URL("/api/portal/status", baseUrl), {
      cache: "no-store",
    });
    if (!response.ok) return { connected: false };
    return (await response.json()) as PortalPublicStatus;
  } catch {
    return { connected: false };
  }
}

export default async function MarketingPage() {
  const [{ profiles, pppoePackages, error }, status] = await Promise.all([
    getPublicPackages(),
    getPublicStatus(),
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
