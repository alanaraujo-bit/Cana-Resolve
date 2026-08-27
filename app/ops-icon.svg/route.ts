import { opsIconSvg } from "@/lib/ops-icon";

export function GET() {
  return new Response(opsIconSvg(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
