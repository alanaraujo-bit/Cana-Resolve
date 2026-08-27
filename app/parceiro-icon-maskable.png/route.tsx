import { ImageResponse } from "next/og";

import { opsIconDataUri } from "@/lib/ops-icon";

/** A versão `maskable`: fundo sangrando até a borda, desenho recuado. */
export function GET() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={opsIconDataUri({ maskable: true })} width={512} height={512} alt="" style={{ width: 512, height: 512 }} />
    ),
    { width: 512, height: 512 },
  );
}
