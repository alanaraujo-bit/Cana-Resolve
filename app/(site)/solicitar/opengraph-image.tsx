import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `Solicite um serviço em ${site.city} pelo ${site.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SolicitarOgImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0d5039", padding: "72px 80px", color: "#f2f7f4", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-radial-gradient(circle at 12% 118%, rgba(255,255,255,0.16) 0 1.5px, rgba(0,0,0,0) 1.5px 52px)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 600 }}><div style={{ width: 56, height: 56, borderRadius: 16, background: "#f2f7f4", color: "#0d5039", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700 }}>CR</div>Canaã Resolve</div>
      <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", maxWidth: 940, fontSize: 72, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2.5 }}>Conte o que precisa resolver.</div><div style={{ display: "flex", marginTop: 26, maxWidth: 880, fontSize: 31, lineHeight: 1.35, color: "#b6d2c4" }}>Envie sua solicitação pelo WhatsApp e nossa equipe faz o encaminhamento inicial.</div></div>
      <div style={{ display: "flex", fontSize: 25, color: "#8fb3a2" }}>{new URL(site.url).host}/solicitar</div>
    </div>,
    { ...size },
  );
}
