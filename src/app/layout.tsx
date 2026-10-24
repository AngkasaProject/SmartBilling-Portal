import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "SmartBilling Portal",
    template: "%s | SmartBilling Portal",
  },
  description: "Portal layanan pelanggan SmartBilling.",
  openGraph: {
    title: "SmartBilling Portal",
    description: "Kelola layanan internet dan tagihan Anda dengan mudah.",
    type: "website",
    locale: "id_ID",
    siteName: "SmartBilling Portal",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SmartBilling Portal — layanan internet dan tagihan dalam satu tempat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartBilling Portal",
    description: "Kelola layanan internet dan tagihan Anda dengan mudah.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
