import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { LinhaDeValor } from '@/ajustes/componentes';
import { abrirAjustesDoSistema, TelaDeAjuste } from '@/ajustes/Tela';
import { space } from '@/theme';
import { Bloco, Button, Grupo, Nota, Text } from '@/ui';

/**
 * Permissões do aparelho.
 *
 * Aqui aparece **só o que o Canaã Resolve usa de verdade**. Uma cópia da tela
 * de Ajustes do sistema, com câmera, microfone, contatos e localização
 * desligados sem motivo, dá a impressão errada de um aplicativo faminto — e
 * ainda ensina a pessoa a ignorar pedidos de permissão (§33, §36).
 *
 * Hoje é uma só: **fotos**, para escolher a imagem do perfil e as fotos de
 * trabalho. Localização não é pedida — ser um aplicativo de bairro não é
 * motivo para saber onde alguém está o tempo todo. Notificações chegam na
 * próxima versão, e a permissão será pedida quando houver o que notificar.
 *
 * Quando uma permissão está negada, a tela diz **por que precisamos**, **o que
 * muda sem ela** e **como habilitar** — nunca só "permissão negada" (§34).
 */

type Situacao = 'lendo' | 'concedida' | 'parcial' | 'negada' | 'a-perguntar' | 'indisponivel';

const frases: Record<Situacao, string> = {
  lendo: 'Conferindo…',
  concedida: 'Liberado',
  parcial: 'Liberado para algumas fotos',
  negada: 'Bloqueado',
  'a-perguntar': 'Vamos pedir quando você for escolher uma foto',
  indisponivel: 'Não se aplica nesta prévia pelo navegador',
};

export default function Permissoes() {
  const [fotos, setFotos] = useState<Situacao>('lendo');
  const [falhaAoAbrir, setFalhaAoAbrir] = useState(false);

  const conferir = useCallback(async () => {
    if (Platform.OS === 'web') {
      // No navegador a galeria é o seletor de arquivos do próprio sistema:
      // não há permissão para consultar, e fingir um estado seria inventar.
      setFotos('indisponivel');
      return;
    }

    try {
      const permissao = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (permissao.granted) {
        setFotos(permissao.accessPrivileges === 'limited' ? 'parcial' : 'concedida');
      } else if (permissao.canAskAgain) {
        setFotos('a-perguntar');
      } else {
        setFotos('negada');
      }
    } catch {
      setFotos('indisponivel');
    }
  }, []);

  useEffect(() => {
    void conferir();
  }, [conferir]);

  const precisaDoSistema = fotos === 'negada' || fotos === 'parcial';

  return (
    <TelaDeAjuste titulo="Permissões">
      <View style={estilos.abertura}>
        <Text variant="body" tone="muted" maxScale={1.3}>
          Estas são as permissões que o aplicativo usa. Nenhuma outra é pedida.
        </Text>
      </View>

      <Grupo titulo="Fotos">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Acesso às suas fotos"
            valor={frases[fotos]}
            explicacao="Usado para escolher sua foto de perfil e as fotos dos seus trabalhos."
          />
        </Bloco>

        {fotos === 'negada' ? (
          <Nota tom="destaque">
            Sem esta permissão, você ainda usa o aplicativo por inteiro — só não consegue escolher
            fotos da galeria. Para liberar, abra as configurações do aparelho e ative o acesso às
            fotos para o Canaã Resolve.
          </Nota>
        ) : null}

        {fotos === 'parcial' ? (
          <Nota>
            Você liberou algumas fotos. Se a que você quer não aparecer, dá para liberar mais nas
            configurações do aparelho.
          </Nota>
        ) : null}

        {precisaDoSistema ? (
          <View style={estilos.acoes}>
            <Button
              label="Abrir configurações do aparelho"
              variant="outline"
              onPress={async () => {
                const abriu = await abrirAjustesDoSistema();
                setFalhaAoAbrir(!abriu);
              }}
            />
            {/* Sem pedir de novo em laço: o sistema não pergunta duas vezes, e
                insistir só faria o botão parecer quebrado (§35). */}
            <Button label="Conferir de novo" variant="quiet" onPress={() => void conferir()} />
          </View>
        ) : null}

        {falhaAoAbrir ? (
          <View accessibilityLiveRegion="polite">
            <Nota>
              Não foi possível abrir as configurações daqui. Abra os ajustes do aparelho, procure o
              Canaã Resolve e libere o acesso às fotos.
            </Nota>
          </View>
        ) : null}
      </Grupo>

      <Grupo titulo="O que não pedimos">
        <Bloco>
          <LinhaDeValor
            primeira
            titulo="Localização"
            explicacao="O aplicativo não acompanha onde você está. A área que você atende é escolhida por você, no Perfil."
          />
          <LinhaDeValor
            titulo="Notificações"
            explicacao="Ainda não enviamos nenhuma. A permissão só vai ser pedida quando houver aviso para mandar."
          />
        </Bloco>
      </Grupo>
    </TelaDeAjuste>
  );
}

const estilos = StyleSheet.create({
  abertura: { paddingHorizontal: space.xs },
  acoes: { gap: space.sm },
});
