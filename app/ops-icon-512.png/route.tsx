import { ImageResponse } from "next/og";

import { opsIconDataUri } from "@/lib/ops-icon";

/**
 * O PNG de 512 que o Android pede para instalar. É o mesmo desenho do SVG,
 * rasterizado: alguns sistemas ainda recusam um manifest que só oferece vetor.
 */
export function GET() {
  return new ImageResponse(
    (
      // O `next/image` não existe dentro de um ImageResponse: aqui o `img` é
      // a forma correta de embutir o vetor antes de rasterizar.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={opsIconDataUri()}
        width={512}
        height={512}
        alt=""
        style={{ width: 512, height: 512 }}
      />
    ),
    { width: 512, height: 512 },
  );
}
