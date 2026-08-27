import { ImageResponse } from "next/og";

import { opsIconDataUri } from "@/lib/ops-icon";

/**
 * A versão `maskable`: fundo sangrando até a borda e desenho recuado para a
 * área segura, para o Android recortar no formato que quiser sem cortar o
 * alfinete ao meio.
 */
export function GET() {
  return new ImageResponse(
    (
      // O `next/image` não existe dentro de um ImageResponse: aqui o `img` é
      // a forma correta de embutir o vetor antes de rasterizar.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={opsIconDataUri({ maskable: true })}
        width={512}
        height={512}
        alt=""
        style={{ width: 512, height: 512 }}
      />
    ),
    { width: 512, height: 512 },
  );
}
