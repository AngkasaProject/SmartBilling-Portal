import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getPortalServerStatus } from "@/lib/billing-api";
import { PortalExperience } from "./portal-experience";

export const metadata: Metadata = {
  title: "Portal Pelanggan",
  description: "Kelola layanan internet dan tagihan Anda.",
  robots: { index: false, follow: false },
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
