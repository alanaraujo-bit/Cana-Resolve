/**
 * O ícone do aplicativo instalado.
 *
 * O desenho é o mesmo alfinete de mapa da marca — se o ícone do Operations
 * fosse outro, o aplicativo instalado pareceria de outra empresa. O que muda é
 * a moldura: `maskable` precisa de margem para o Android recortar em círculo,
 * em pétala ou em quadrado arredondado sem cortar o desenho.
 */
const MARK = `
  <path d="M16 6.6c-3.7 0-6.7 3-6.7 6.7 0 4.9 5.6 10.4 6.3 11.1a.6.6 0 0 0 .8 0c.7-.7 6.3-6.2 6.3-11.1 0-3.7-3-6.7-6.7-6.7Z" fill="none" stroke="#ffffff" stroke-width="1.9"/>
  <path d="m12.9 13.3 2.3 2.4 4.1-4.5" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
`;

export function opsIconSvg({ maskable = false }: { maskable?: boolean } = {}) {
  // A área segura de um ícone maskable é o círculo central de 80%: o desenho
  // encolhe para caber nela, e o fundo sangra até a borda.
  const escala = maskable ? 0.66 : 1;
  const deslocamento = (32 - 32 * escala) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512">
  <rect width="32" height="32" ${maskable ? "" : 'rx="9"'} fill="#0e5c42"/>
  <g transform="translate(${deslocamento} ${deslocamento}) scale(${escala})">${MARK}</g>
</svg>`;
}

export function opsIconDataUri(options?: { maskable?: boolean }) {
  return `data:image/svg+xml;base64,${Buffer.from(opsIconSvg(options)).toString("base64")}`;
}
