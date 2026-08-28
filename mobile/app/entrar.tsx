import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import Animated, { FadeInDown, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appleDisponivel, iniciarApple } from '@/auth/apple';
import { toAuthError } from '@/auth/errors';
import { googleDisponivel, iniciarGoogle } from '@/auth/google';
import { trocarPorSessao, validarEmail, validarSenha } from '@/auth/service';
import { useSession } from '@/session/SessionProvider';
import { gutter, motion, radius, space, useTheme } from '@/theme';
import {
  AlertIcon,
  Button,
  GoogleMark,
  Text,
  TextField,
  Wordmark,
  haptics,
  useCanvasParallax,
} from '@/ui';

const SITE_PARCEIROS = 'https://canaaresolve.aionixdev.com/parceiros';

type Envio = 'parado' | 'senha' | 'google' | 'apple';

export default function Entrar() {
  const { colors, isDark, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const canvas = useCanvasParallax();
  const { signIn, replayOnboarding, motivoDeSaida, limparMotivoDeSaida } = useSession();

  const senhaRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; detalhe?: string; tom?: 'erro' | 'nota' } | null>(null);
  const [envio, setEnvio] = useState<Envio>('parado');
  const [apple, setApple] = useState(false);

  useEffect(() => {
    // O fundo chega em repouso: a mesma paisagem do onboarding, parada.
    canvas.value = withTiming(3, { duration: motion.duration.deliberate });
  }, [canvas]);

  /**
   * Chegar aqui pode ser uma escolha ou uma expulsão. Quando a sessão expirou,
   * a pessoa precisa saber por que voltou para esta tela — senão parece que o
   * aplicativo se perdeu. A explicação é dita uma vez e some; ela não é erro,
   * então não vem vestida de erro.
   */
  useEffect(() => {
    if (motivoDeSaida !== 'expirada') return;
    setAviso({ texto: 'Sua sessão expirou. Entre novamente para continuar.', tom: 'nota' });
    limparMotivoDeSaida();
  }, [motivoDeSaida, limparMotivoDeSaida]);

  useEffect(() => {
    let alive = true;
    appleDisponivel().then((ok) => alive && setApple(ok));
    return () => {
      alive = false;
    };
  }, []);

  const ocupado = envio !== 'parado';

  const mostrarErro = useCallback((error: unknown) => {
    const auth = toAuthError(error);
    if (auth.code === 'cancelado') {
      setAviso(null);
      return;
    }
    haptics.error();
    setAviso({ texto: auth.userMessage, detalhe: __DEV__ ? auth.detail : undefined });
  }, []);

  const entrarComSenha = useCallback(async () => {
    if (ocupado) return;
    const e = validarEmail(email);
    const s = validarSenha(senha);
    setErroEmail(e);
    setErroSenha(s);
    setAviso(null);
    if (e || s) {
      haptics.error();
      return;
    }

    setEnvio('senha');
    try {
      const { account, token } = await trocarPorSessao({
        tipo: 'senha',
        email: email.trim(),
        senha,
      });
      haptics.success();
      await signIn(account, token);
    } catch (error) {
      mostrarErro(error);
    } finally {
      setEnvio('parado');
    }
  }, [email, mostrarErro, ocupado, senha, signIn]);

  const entrarComGoogle = useCallback(async () => {
    if (ocupado) return;
    setAviso(null);
    setEnvio('google');
    try {
      const credencial = await iniciarGoogle();
      const { account, token } = await trocarPorSessao(credencial);
      haptics.success();
      await signIn(account, token);
    } catch (error) {
      mostrarErro(error);
    } finally {
      setEnvio('parado');
    }
  }, [mostrarErro, ocupado, signIn]);

  const entrarComApple = useCallback(async () => {
    if (ocupado) return;
    setAviso(null);
    setEnvio('apple');
    try {
      const credencial = await iniciarApple();
      const { account, token } = await trocarPorSessao(credencial);
      haptics.success();
      await signIn(account, token);
    } catch (error) {
      mostrarErro(error);
    } finally {
      setEnvio('parado');
    }
  }, [mostrarErro, ocupado, signIn]);

  /**
   * Atalho exclusivo de desenvolvimento: entra na área do profissional sem
   * autenticar ninguém, para que a interface possa ser construída enquanto a
   * API de autenticação não existe. A conta carrega `origem:
   * 'desenvolvimento'`, e o bloco que chama isto só é compilado sob `__DEV__`.
   */
  const entrarSemAutenticar = useCallback(() => {
    if (!__DEV__) return;
    void signIn({
      id: 'dev-profissional',
      nome: 'João Batista',
      email: 'joao.batista@exemplo.com',
      papel: 'profissional',
      origem: 'desenvolvimento',
    });
  }, [signIn]);

  const recuperarSenha = useCallback(() => {
    setAviso({
      texto: 'A recuperação de senha estará disponível em breve. Fale com a equipe do Canaã Resolve.',
    });
  }, []);

  const abrirParceiros = useCallback(() => {
    WebBrowser.openBrowserAsync(SITE_PARCEIROS, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.brand,
      toolbarColor: colors.bg,
    }).catch(() => {});
  }, [colors.bg, colors.brand]);

  const entrada = (delay: number) =>
    reduceMotion ? undefined : FadeInDown.duration(motion.duration.slow).delay(delay).springify().damping(18);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space['2xl'], paddingBottom: Math.max(insets.bottom, space.xl) + space['3xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <Animated.View entering={entrada(0)}>
          <Wordmark size="sm" subtitle="Área do profissional" />
        </Animated.View>

        <Animated.View entering={entrada(60)} style={styles.titulos}>
          <Text variant="displayLG">Bem-vindo de volta</Text>
          <Text variant="body" tone="muted">
            Acesse sua conta profissional para ver os pedidos da sua região.
          </Text>
        </Animated.View>

        {aviso ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(motion.duration.base)}
            style={[
              styles.aviso,
              aviso.tom === 'nota'
                ? { backgroundColor: colors.surface2, borderColor: colors.line }
                : { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
            ]}
            accessibilityLiveRegion="assertive"
          >
            <AlertIcon size={18} color={aviso.tom === 'nota' ? colors.muted : colors.danger} />
            <View style={styles.avisoTexto}>
              <Text variant="callout" tone={aviso.tom === 'nota' ? 'muted' : 'danger'}>
                {aviso.texto}
              </Text>
              {aviso.detalhe ? (
                <Text variant="caption" tone="faint">
                  {`Desenvolvimento — ${aviso.detalhe}`}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={entrada(120)} style={styles.form}>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (erroEmail) setErroEmail(null);
            }}
            error={erroEmail}
            editable={!ocupado}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => senhaRef.current?.focus()}
            testID="campo-email"
          />

          <TextField
            ref={senhaRef}
            label="Senha"
            secure
            value={senha}
            onChangeText={(v) => {
              setSenha(v);
              if (erroSenha) setErroSenha(null);
            }}
            error={erroSenha}
            editable={!ocupado}
            placeholder="Sua senha"
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={entrarComSenha}
            testID="campo-senha"
          />

          <Pressable
            onPress={recuperarSenha}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Esqueci minha senha"
            style={({ pressed }) => [styles.esqueci, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Text variant="label" tone="brand">
              Esqueci minha senha
            </Text>
          </Pressable>

          <Button
            label="Entrar"
            onPress={entrarComSenha}
            loading={envio === 'senha'}
            disabled={ocupado && envio !== 'senha'}
            haptic="commit"
            testID="botao-entrar"
          />
        </Animated.View>

        <Animated.View entering={entrada(180)} style={styles.separador}>
          <View style={[styles.risco, { backgroundColor: colors.line }]} />
          <Text variant="caption" tone="faint">
            ou
          </Text>
          <View style={[styles.risco, { backgroundColor: colors.line }]} />
        </Animated.View>

        <Animated.View entering={entrada(220)} style={styles.social}>
          <Button
            label="Continuar com o Google"
            variant="outline"
            onPress={entrarComGoogle}
            loading={envio === 'google'}
            disabled={ocupado && envio !== 'google'}
            icon={<GoogleMark size={19} />}
            accessibilityHint={
              googleDisponivel()
                ? 'Abre a tela de contas do Google'
                : 'Ainda não disponível neste aparelho'
            }
          />

          {apple ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={radius.pill}
              style={styles.apple}
              onPress={entrarComApple}
            />
          ) : null}
        </Animated.View>

        <Animated.View entering={entrada(280)} style={styles.rodape}>
          <Text variant="callout" tone="muted" center>
            Ainda não faz parte da rede de parceiros?
          </Text>
          <Pressable
            onPress={abrirParceiros}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel="Quero ser parceiro"
            accessibilityHint="Abre a página de parceiros do Canaã Resolve"
            style={({ pressed }) => [styles.parceiro, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text variant="bodyStrong" tone="brand">
              Quero ser parceiro
            </Text>
          </Pressable>
        </Animated.View>

        {/* Atalhos de desenvolvimento. Todo este bloco vive sob `__DEV__` e não
            existe no pacote publicado: nenhum deles autentica coisa alguma —
            o de cima abre a área do profissional com dados de exemplo, para
            que a interface possa ser construída enquanto a API não existe. */}
        {__DEV__ ? (
          <View style={[styles.dev, { borderColor: colors.line }]}>
            <Text variant="overline" tone="faint" center>
              DESENVOLVIMENTO
            </Text>
            <Pressable
              onPress={entrarSemAutenticar}
              style={({ pressed }) => [styles.devAcao, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Abrir a área do profissional com dados de exemplo"
            >
              <Text variant="caption" tone="muted" center>
                Abrir a área do profissional com dados de exemplo
              </Text>
            </Pressable>
            <Pressable
              onPress={replayOnboarding}
              style={({ pressed }) => [styles.devAcao, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Rever apresentação"
            >
              <Text variant="caption" tone="muted" center>
                Rever a apresentação
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: gutter, gap: space['2xl'] },
  titulos: { gap: space.sm },
  form: { gap: space.lg },
  esqueci: { alignSelf: 'flex-end', paddingVertical: space.xs, marginTop: -space.xs },
  aviso: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  avisoTexto: { flex: 1, gap: 4 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  risco: { flex: 1, height: StyleSheet.hairlineWidth },
  social: { gap: space.md },
  apple: { height: 54, width: '100%' },
  rodape: { alignItems: 'center', gap: space.xs },
  parceiro: { paddingVertical: space.xs },
  dev: {
    gap: space.sm,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  devAcao: { paddingVertical: space.xs },
});
