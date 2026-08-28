/**
 * O esqueleto de uma seção de edição.
 *
 * Seis telas fazem a mesma coisa: pegam o perfil, deixam mexer numa parte,
 * salvam quando o parceiro manda e avisam se ele sair sem salvar. Escrever
 * isso seis vezes é como as seis telas acabam divergindo — então mora aqui.
 *
 * Três decisões de produto estão embutidas:
 *
 * 1. **Salvar é explícito.** Nada grava enquanto se digita. O que não foi
 *    confirmado não vale, e o botão só acende quando há o que salvar.
 * 2. **Sair sem salvar pergunta uma vez.** É a única confirmação do módulo:
 *    ela evita perder trabalho de verdade. Sair sem ter mexido em nada não
 *    pergunta nada.
 * 3. **Falha não apaga o que foi digitado.** Se salvar não der certo, o
 *    rascunho continua na tela com a frase do erro em cima.
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO_BARRA } from '@/navigation/BarraPrincipal';
import { gutter, hitTarget, space, useTheme } from '@/theme';
import { haptics, Text } from '@/ui';
import { registrar } from './analytics';
import type { Secao } from './completude';
import { CabecalhoDeTela, Nota } from './componentes';
import { usePerfil } from './PerfilProvider';
import type { Perfil } from './tipos';

type Edicao = {
  /** O rascunho em edição. Nunca o perfil salvo. */
  rascunho: Perfil;
  /** Muda um pedaço do rascunho — e só esse pedaço vai para o servidor. */
  mexer: (parte: Partial<Perfil>) => void;
  alterado: boolean;
  salvando: boolean;
  erro: string | null;
  salvar: () => Promise<void>;
  sair: () => void;
};

/**
 * Prepara a edição de uma seção.
 *
 * Devolve `null` enquanto o perfil não chegou — a tela mostra o esqueleto ou
 * simplesmente nada, mas nunca um formulário vazio que depois se preenche
 * sozinho debaixo do dedo de quem já começou a digitar.
 */
export function useEdicao(secao: Secao): Edicao | null {
  const router = useRouter();
  const { perfil, salvar: salvarNoProvider, salvando } = usePerfil();

  const [rascunho, setRascunho] = useState<Perfil | null>(perfil);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Só os campos que esta tela realmente mexeu.
   *
   * Salvar o perfil inteiro seria o jeito óbvio — e o jeito de perder dado: uma
   * tela aberta antes guarda uma cópia velha, e ao salvar ela desfaz o que
   * outra seção salvou no meio tempo. Como cada seção mexe em campos
   * diferentes, mandar só o pedaço faz as edições não se atropelarem.
   */
  const [remendo, setRemendo] = useState<Partial<Perfil>>({});
  const alterado = Object.keys(remendo).length > 0;

  // O perfil chega depois do primeiro render quando a tela abre por link.
  // Só adota o que chegou se ninguém começou a editar.
  useEffect(() => {
    if (perfil && !alterado) setRascunho(perfil);
  }, [perfil, alterado]);

  useEffect(() => {
    registrar({ nome: 'edicao_iniciada', secao });
  }, [secao]);

  const mexer = useCallback((parte: Partial<Perfil>) => {
    setRascunho((atual) => (atual ? { ...atual, ...parte } : atual));
    setRemendo((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }, []);

  const salvar = useCallback(async () => {
    if (!alterado) return;
    try {
      await salvarNoProvider(remendo);
      setRemendo({});
      haptics.success();
      router.back();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Não foi possível salvar suas alterações agora.',
      );
      haptics.error();
    }
  }, [alterado, remendo, salvarNoProvider, router]);

  const sair = useCallback(() => {
    if (!alterado) {
      router.back();
      return;
    }
    Alert.alert(
      'Sair sem salvar?',
      'O que você mudou aqui será perdido.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        {
          text: 'Sair sem salvar',
          style: 'destructive',
          onPress: () => {
            registrar({ nome: 'edicao_abandonada', secao });
            // Desfaz o rascunho: a tela pode continuar montada na pilha, e um
            // rascunho abandonado não pode voltar à vida num salvar posterior.
            setRemendo({});
            setRascunho(perfil);
            router.back();
          },
        },
      ],
      { cancelable: true },
    );
  }, [alterado, router, secao, perfil]);

  if (!rascunho) return null;

  return { rascunho, mexer, alterado, salvando, erro, salvar, sair };
}

/**
 * O que a seção mostra enquanto o perfil não chegou.
 *
 * Acontece quando a tela é aberta direto — por link, e um dia por notificação
 * — sem passar pela capa. Sem isto, a tela fica em branco e parece travada.
 */
export function CarregandoEdicao({ titulo }: { titulo: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={estilos.tela}>
      <View style={{ paddingTop: insets.top + space.sm }}>
        <CabecalhoDeTela titulo={titulo} aoVoltar={() => router.back()} />
      </View>
      <View style={estilos.carregando}>
        <Text variant="callout" tone="muted" center maxScale={1.25}>
          Carregando seu perfil…
        </Text>
      </View>
    </View>
  );
}

/**
 * A moldura de uma seção: cabeçalho com voltar e salvar, e o conteúdo rolando
 * por baixo. O teclado empurra o conteúdo em vez de cobrir o campo.
 */
export function TelaDeEdicao({
  titulo,
  edicao,
  children,
  /** Impede salvar e diz por quê. Só para o que realmente não pode ir. */
  impedimento,
}: {
  titulo: string;
  edicao: Edicao;
  children: ReactNode;
  impedimento?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const podeSalvar = edicao.alterado && !edicao.salvando && !impedimento;

  return (
    <KeyboardAvoidingView
      style={estilos.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={{ paddingTop: insets.top + space.sm }}>
        <CabecalhoDeTela
          titulo={titulo}
          aoVoltar={edicao.sair}
          direita={
            <Pressable
              onPress={() => void edicao.salvar()}
              disabled={!podeSalvar}
              accessibilityRole="button"
              accessibilityLabel="Salvar"
              accessibilityState={{ disabled: !podeSalvar }}
              accessibilityHint={impedimento ?? undefined}
              hitSlop={10}
              style={estilos.salvar}
            >
              <Text
                variant="button"
                maxScale={1.2}
                style={{
                  color: podeSalvar ? colors.brandInk : colors.faint,
                }}
              >
                {edicao.salvando ? 'Salvando…' : 'Salvar'}
              </Text>
            </Pressable>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          estilos.conteudo,
          { paddingBottom: insets.bottom + ESPACO_BARRA },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {edicao.erro ? <Nota tom="destaque">{edicao.erro}</Nota> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  salvar: {
    minHeight: hitTarget,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  conteudo: {
    paddingHorizontal: gutter,
    paddingTop: space.xl,
    gap: space['2xl'],
  },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: gutter },
});
