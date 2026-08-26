import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — profissionais e serviços em ${site.city}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d5039",
          padding: "72px 80px",
          color: "#f2f7f4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-radial-gradient(circle at 12% 118%, rgba(255,255,255,0.16) 0 1.5px, rgba(0,0,0,0) 1.5px 52px)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#f2f7f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0d5039",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            CR
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            Canaã Resolve
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: -2.5,
              maxWidth: 940,
            }}
          >
            O que você precisa resolver hoje?
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 31,
              lineHeight: 1.35,
              color: "#b6d2c4",
              maxWidth: 880,
            }}
          >
            Conte o seu problema e a gente conecta você a profissionais e
            empresas de Canaã dos Carajás que podem resolver.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 25 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.28)",
              color: "#dcece4",
            }}
          >
            Canaã dos Carajás — PA
          </div>
          <div style={{ display: "flex", color: "#8fb3a2" }}>canaaresolve.aionixdev.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
