import { ImageResponse } from "next/og";

import { opsIconDataUri } from "@/lib/ops-icon";

/**
 * O mesmo alfinete de mapa da marca, rasterizado para o manifest do Parceiro
 * — não um ícone "de ops" reaproveitado por acaso. Se o instalado parecesse
 * outro desenho, o aplicativo pareceria de outra empresa.
 */
export function GET() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={opsIconDataUri()} width={512} height={512} alt="" style={{ width: 512, height: 512 }} />
    ),
    { width: 512, height: 512 },
  );
}
