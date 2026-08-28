/**
 * Escolher e preparar imagens — foto/logo e portfólio.
 *
 * A fronteira honesta desta fase mora aqui. O aparelho **de verdade** abre a
 * galeria, pede permissão, redimensiona e comprime: isso tudo funciona. O que
 * não existe é para onde mandar depois. Não há servidor de mídia, então toda
 * imagem nasce e permanece `origem: 'local'`, vivendo no cache do aparelho.
 *
 * Nada aqui simula upload, mostra barra de progresso falsa nem diz "enviado".
 * Ver `enviar()`, no fim do arquivo, e `PERFIL.md`.
 *
 * API do SDK 54 (conferida na documentação da versão, não de memória):
 * `mediaTypes` é um array (`['images']`) — o enum `MediaTypeOptions` está
 * obsoleto; e `manipulateAsync` deu lugar a `ImageManipulator.manipulate()`.
 */

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Imagem } from './tipos';

/** O que pode dar errado, em termos que a tela sabe traduzir. */
export type MotivoDeFalha = 'permissao' | 'leitura';

export class ErroDeImagem extends Error {
  constructor(readonly motivo: MotivoDeFalha) {
    super(motivo);
    this.name = 'ErroDeImagem';
  }
}

/** A frase que o parceiro lê. Nunca o erro técnico. */
export function mensagemDaFalha(motivo: MotivoDeFalha): string {
  return motivo === 'permissao'
    ? 'O Canaã Resolve precisa da sua permissão para abrir as fotos. Você pode liberar nos ajustes do aparelho.'
    : 'Não deu para usar essa imagem. Tente outra.';
}

/**
 * Os dois usos, com tamanhos diferentes de propósito.
 *
 * O retrato é quadrado porque aparece em círculo — recortar depois distorce.
 * O portfólio mantém o enquadramento de quem fotografou: um quadro de energia
 * é uma foto vertical, e cortá-la em quadrado esconde justamente o trabalho.
 */
type Uso = 'retrato' | 'portfolio';

const AJUSTES: Record<Uso, { lado: number; qualidade: number; recorta: boolean }> = {
  retrato: { lado: 720, qualidade: 0.82, recorta: true },
  portfolio: { lado: 1440, qualidade: 0.78, recorta: false },
};

/**
 * Abre a galeria e devolve a imagem já reduzida.
 * `null` quando a pessoa desistiu — desistir não é erro e não vira mensagem.
 */
export async function escolherImagem(uso: Uso): Promise<Imagem | null> {
  const ajuste = AJUSTES[uso];

  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) throw new ErroDeImagem('permissao');

  const escolha = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: ajuste.recorta,
    aspect: ajuste.recorta ? [1, 1] : undefined,
    quality: 1,
    allowsMultipleSelection: false,
  });

  if (escolha.canceled) return null;

  const bruta = escolha.assets?.[0];
  if (!bruta) return null;

  return reduzir(bruta.uri, bruta.width, bruta.height, uso);
}

/**
 * Reduz para o que a tela realmente usa.
 *
 * Uma foto de celular tem 4000 px de largura e alguns megabytes; a maior
 * superfície onde ela aparece tem menos de 400. Guardar o original só gasta
 * memória e deixa a lista travada — e o dia em que houver upload, ele será por
 * dados móveis de Canaã.
 */
async function reduzir(uri: string, largura: number, altura: number, uso: Uso): Promise<Imagem> {
  const { lado, qualidade } = AJUSTES[uso];

  try {
    const maior = Math.max(largura, altura);

    // Já é pequena: mexer só perderia qualidade de graça.
    if (maior <= lado) {
      return { uri, largura, altura, origem: 'local' };
    }

    const escala = lado / maior;
    const alvo =
      largura >= altura ? { width: lado, height: null } : { width: null, height: lado };

    const pronta = await ImageManipulator.manipulate(uri).resize(alvo).renderAsync();
    const salva = await pronta.saveAsync({ format: SaveFormat.JPEG, compress: qualidade });

    return {
      uri: salva.uri,
      largura: salva.width ?? Math.round(largura * escala),
      altura: salva.height ?? Math.round(altura * escala),
      origem: 'local',
    };
  } catch {
    throw new ErroDeImagem('leitura');
  }
}

/**
 * O que falta para a imagem sair do aparelho.
 *
 * Deliberadamente não implementado. Quando existir o serviço de mídia, é esta
 * função que ganha corpo — ela recebe uma `Imagem` local, sobe o arquivo e
 * devolve a mesma imagem com `origem: 'remota'` e a URL do servidor. As telas
 * não mudam: elas já tratam `origem` e nunca supõem que um `uri` é público.
 *
 * Até lá, quem chamar recebe um "não" claro, e não um sucesso inventado.
 */
export async function enviar(_imagem: Imagem): Promise<never> {
  throw new Error(
    'Envio de imagem ainda não existe: falta o serviço de mídia. Ver PERFIL.md.',
  );
}

/** As imagens do perfil já saíram do aparelho? Hoje, nenhuma. */
export function temImagemPendenteDeEnvio(imagens: (Imagem | null)[]): boolean {
  return imagens.some((i) => i !== null && i.origem === 'local');
}
