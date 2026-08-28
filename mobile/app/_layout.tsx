import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationTheme,
} from '@react-navigation/native';
import { Stack, useRouter, usePathname, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/session/SessionProvider';
import { ThemeProvider, useTheme } from '@/theme';
import { lerPreferenciaDeTema, type ThemePreference } from '@/theme/preferencia';
import { BrandCanvas, CanvasMotionProvider, useCanvasParallax } from '@/ui';

/**
 * As telas do produto são transparentes, porque o fundo de marca é um só e vive
 * atrás da pilha. Para isso funcionar, quem não está em foco precisa sair
 * mesmo da tela — é o que o `react-native-screens` faz no iOS e no Android por
 * padrão, e o que esta chamada liga também na web (onde ele vem desligado e as
 * abas ficariam empilhadas umas sobre as outras).
 */
enableScreens(true);

// A splash sai quando a tipografia estiver pronta — não um milissegundo depois.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [interReady] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [frauncesReady] = useFraunces({ Fraunces_600SemiBold, Fraunces_700Bold });

  /**
   * O tema escolhido precisa chegar **antes** do primeiro quadro.
   *
   * A leitura é assíncrona; se ela resolvesse depois da primeira pintura, um
   * aparelho no escuro com "Claro" salvo abriria escuro e piscaria para claro.
   * Como a splash já está segurada pelas fontes, esperar mais este disco não
   * custa nada ao usuário e evita o lampejo.
   */
  const [tema, setTema] = useState<ThemePreference | null>(null);
  useEffect(() => {
    let alive = true;
    lerPreferenciaDeTema().then((p) => alive && setTema(p));
    return () => {
      alive = false;
    };
  }, []);

  const ready = interReady && frauncesReady && tema !== null;

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider preferenciaInicial={tema}>
          <SessionProvider>
            <CanvasMotionProvider>
              <Shell />
            </CanvasMotionProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const { colors, isDark, reduceMotion } = useTheme();
  const parallax = useCanvasParallax();

  useEffect(() => {
    // O fundo do sistema acompanha o tema: sem lampejo branco ao girar ou
    // ao abrir o teclado no Android.
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  const onReady = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // O fundo de marca é único e vive atrás da pilha: as telas precisam ser
  // transparentes, ou o tema padrão da navegação as cobre com cinza.
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: 'transparent',
      card: 'transparent',
      text: colors.ink,
      border: colors.line,
      primary: colors.brand,
    },
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]} onLayout={onReady}>
      <BrandCanvas parallax={parallax} />
      <Gate />
      <NavigationTheme value={navigationTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reduceMotion ? 'none' : 'fade',
            animationDuration: 340,
            contentStyle: { backgroundColor: 'transparent' },
            gestureEnabled: false,
          }}
        />
      </NavigationTheme>
      <StatusBar style={isDark ? 'light' : 'dark'} animated translucent />
    </View>
  );
}

/**
 * O porteiro: uma máquina de estados, não um emaranhado de `if` nas telas.
 *
 *   carregando → primeira-vez (onboarding) → sem-sessão (entrar) → autenticado
 *
 * Quando existirem as áreas do profissional e do morador, elas entram aqui
 * como mais um destino — nenhuma tela precisa saber de rota.
 */
function Gate() {
  const { stage, account } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Para onde a pessoa estava indo antes de o porteiro mandá-la entrar.
   *
   * Um link ou uma notificação pode apontar direto para uma oportunidade. Se o
   * aplicativo estiver fechado, o caminho é: abrir → entrar → **e chegar onde
   * se queria chegar**. Sem isto, autenticar joga todo mundo no Início e o
   * link se perde no meio do caminho.
   */
  const destino = useRef<string | null>(null);
  const primeira = useRef(true);
  if (primeira.current) {
    primeira.current = false;
    if (pathname && pathname !== '/' && !pathname.startsWith('/entrar') && !pathname.startsWith('/onboarding')) {
      destino.current = pathname;
    }
  }

  useEffect(() => {
    if (stage === 'carregando') return;

    const atual = segments[0] ?? '';

    if (stage === 'primeira-vez' && atual !== 'onboarding') {
      router.replace('/onboarding');
      return;
    }
    if (stage === 'sem-sessao' && atual !== 'entrar') {
      router.replace('/entrar');
      return;
    }
    if (stage === 'autenticado' && account && atual !== '(app)') {
      // Hoje só existe a área do profissional. Quando o morador entrar, é aqui
      // que o papel da conta escolhe o destino — e não a tela de origem.
      const pretendido = destino.current;
      destino.current = null;
      router.replace(pretendido ? (pretendido as Href) : '/inicio');
    }
  }, [stage, account, segments, router]);

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
