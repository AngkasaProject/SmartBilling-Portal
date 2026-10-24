import { ImageResponse } from "next/og";

export const alt =
  "SmartBilling Portal — layanan internet dan tagihan dalam satu tempat";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#f8fafc",
          backgroundColor: "#020617",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "linear-gradient(135deg, #6366f1, #10b981)",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ fontSize: 26, fontWeight: 600 }}>
            SmartBilling Portal
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              color: "#a5b4fc",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Layanan pelanggan
          </div>
          <div
            style={{
              maxWidth: 920,
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: -2,
            }}
          >
            Semua layanan dan tagihan dalam satu tempat.
          </div>
          <div style={{ color: "#94a3b8", fontSize: 25 }}>
            Periksa status internet, kuota, dan pembayaran Anda.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            width: 160,
            height: 6,
            borderRadius: 999,
            background: "linear-gradient(90deg, #818cf8, #34d399)",
          }}
        />
      </div>
    ),
    size,
  );
}
