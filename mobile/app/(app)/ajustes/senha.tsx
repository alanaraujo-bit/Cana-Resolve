import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { registrar } from '@/ajustes/analytics';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { alterarSenhaDaConta, ErroDeSenha, validarSenhaNova } from '@/auth/service';
import { useSession } from '@/session/SessionProvider';
import { radius, space, useTheme } from '@/theme';
import { AlertIcon, Button, CheckIcon, Nota, Text, TextField, haptics } from '@/ui';

/**
 * Alterar senha.
 *
 * A tela mais fácil de fazer errado da Fase 05, porque a versão errada é
 * bonita: três campos, um botão e um "Senha alterada com sucesso" que não
 * alterou nada. Esta não faz isso — do outro lado existe uma rota de verdade
 * que confere a senha atual, grava a nova e derruba os outros aparelhos.
 *
 * As decisões que sobraram, depois disso:
 *
 * - **A senha atual é pedida.** Estar com o aplicativo aberto prova que o
 *   aparelho está logado, não que quem o segura é o dono da conta.
 * - **A régua é curta e explicada antes do erro.** Oito caracteres, e não só
 *   números. Exigir símbolo e maiúscula não compra segurança — compra senha
 *   anotada num papel dentro da van.
 * - **A confirmação existe** porque digitar errado uma senha oculta e só
 *   descobrir no próximo login é um jeito cruel de perder a conta.
 * - **A sessão que trocou continua aberta.** Ninguém é expulso por ter feito a
 *   coisa certa.
 */
export default function AlterarSenha() {
  const { colors } = useTheme();
  const router = useRouter();
  const { token, sessaoExpirou } = useSession();

  const novaRef = useRef<TextInput>(null);
  const confirmaRef = useRef<TextInput>(null);

  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erroAtual, setErroAtual] = useState<string | null>(null);
  const [erroNova, setErroNova] = useState<string | null>(null);
  const [erroConfirma, setErroConfirma] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; detalhe?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);

  const enviar = useCallback(async () => {
    if (enviando) return;

    const faltaAtual = atual ? null : 'Informe a sua senha atual.';
    const fraca = validarSenhaNova(nova);
    const diferente = nova === confirma ? null : 'As duas senhas não são iguais.';

    setErroAtual(faltaAtual);
    setErroNova(fraca);
    setErroConfirma(diferente);
    setAviso(null);

    if (faltaAtual || fraca || diferente) {
      haptics.error();
      return;
    }

    if (!token) {
      // Sem credencial não há o que autorizar a troca. Acontece na sessão de
      // desenvolvimento, que não autenticou ninguém.
      setAviso({ texto: 'Entre com sua conta para alterar a senha.' });
      return;
    }

    setEnviando(true);
    try {
      await alterarSenhaDaConta(token, atual, nova);
      haptics.success();
      registrar({ nome: 'senha_alterada' });
      setPronto(true);
      setAtual('');
      setNova('');
      setConfirma('');
    } catch (erro) {
      haptics.error();
      const e = erro instanceof ErroDeSenha ? erro : null;

      if (e?.code === 'sessao') {
        // O servidor recusou a credencial: uma transição só, feita pela fonte
        // única de sessão. A tela não redireciona ninguém.
        await sessaoExpirou();
        return;
      }
      if (e?.code === 'senha-atual') {
        setErroAtual('A senha atual não confere.');
        return;
      }
      if (e?.code === 'senha-fraca' || e?.code === 'senha-igual') {
        setErroNova(e.message);
        return;
      }
      setAviso({
        texto: e?.message ?? 'Não foi possível alterar sua senha agora.',
        detalhe: __DEV__ ? e?.detalhe : undefined,
      });
    } finally {
      setEnviando(false);
    }
  }, [atual, confirma, enviando, nova, sessaoExpirou, token]);

  if (pronto) {
    return (
      <TelaDeAjuste titulo="Alterar senha">
        <View
          style={[estilos.sucesso, { backgroundColor: colors.brandSoft, borderColor: colors.brandLine }]}
          accessibilityLiveRegion="polite"
        >
          <CheckIcon size={22} color={colors.brandInk} />
          <Text variant="title" maxScale={1.25}>
            Senha alterada
          </Text>
          <Text variant="callout" tone="muted" maxScale={1.25}>
            Da próxima vez, entre com a senha nova. Se você estava conectado em outro aparelho, ele
            vai pedir para entrar de novo — é assim que a troca protege sua conta.
          </Text>
        </View>
        <Button label="Voltar" variant="outline" onPress={() => router.back()} />
      </TelaDeAjuste>
    );
  }

  return (
    <TelaDeAjuste titulo="Alterar senha">
      {aviso ? (
        <View
          style={[estilos.aviso, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}
          accessibilityLiveRegion="assertive"
        >
          <AlertIcon size={18} color={colors.danger} />
          <View style={estilos.avisoTexto}>
            <Text variant="callout" tone="danger" maxScale={1.25}>
              {aviso.texto}
            </Text>
            {aviso.detalhe ? (
              <Text variant="caption" tone="faint" maxScale={1.1}>
                {`Desenvolvimento — ${aviso.detalhe}`}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={estilos.campos}>
        <TextField
          label="Senha atual"
          secure
          value={atual}
          onChangeText={(v) => {
            setAtual(v);
            if (erroAtual) setErroAtual(null);
          }}
          error={erroAtual}
          editable={!enviando}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => novaRef.current?.focus()}
          testID="campo-senha-atual"
        />

        <TextField
          ref={novaRef}
          label="Nova senha"
          secure
          value={nova}
          onChangeText={(v) => {
            setNova(v);
            if (erroNova) setErroNova(null);
          }}
          error={erroNova}
          editable={!enviando}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmaRef.current?.focus()}
          testID="campo-senha-nova"
        />

        <TextField
          ref={confirmaRef}
          label="Repita a nova senha"
          secure
          value={confirma}
          onChangeText={(v) => {
            setConfirma(v);
            if (erroConfirma) setErroConfirma(null);
          }}
          error={erroConfirma}
          editable={!enviando}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={enviar}
          testID="campo-senha-confirma"
        />
      </View>

      {/* A régua chega antes do erro: ninguém deveria descobrir a regra sendo
          recusado por ela. */}
      <Nota>
        A senha precisa de pelo menos 8 caracteres e não pode ser só números. Ao trocar, os outros
        aparelhos conectados vão pedir para entrar de novo.
      </Nota>

      <Button
        label="Alterar senha"
        onPress={enviar}
        loading={enviando}
        haptic="commit"
        testID="botao-alterar-senha"
      />
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: space.lg },
  aviso: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  avisoTexto: { flex: 1, gap: 4 },
  sucesso: {
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
