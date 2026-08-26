import { site } from "./site";

/** Monta um link wa.me com a mensagem já escrita. */
export function waLink(message: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const partnerMessage =
  "Olá! Vi a página do Canaã Resolve e quero ser Parceiro Fundador. " +
  "Meu nome é: \nMinha área de atuação é: ";

export const contactMessage =
  "Olá! Cheguei pelo site do Canaã Resolve e gostaria de falar com vocês.";
