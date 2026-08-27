import { ImageResponse } from "next/og";

import { opsIconDataUri } from "@/lib/ops-icon";

/**
 * O PNG de 512 que o manifest do site pede para instalar. Mesmo alfinete de
 * `app/icon.svg`, rasterizado — alguns sistemas recusam um manifest que só
 * oferece vetor.
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
