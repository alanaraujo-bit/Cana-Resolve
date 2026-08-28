import { registrar } from '@/ajustes/analytics';
import { OpcaoEscolhida } from '@/ajustes/componentes';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { useTheme, type ThemePreference } from '@/theme';
import { Bloco, Grupo, Nota, haptics } from '@/ui';

/**
 * Aparência.
 *
 * Três opções, e só três. Não existe azul, roxo, verde ou "tema personalizado":
 * a identidade do Canaã Resolve é fixa, e aparência aqui quer dizer claro,
 * escuro ou o que o aparelho decidir (§23).
 *
 * **Sistema é uma preferência, não um retrato.** Quem escolhe Sistema e à noite
 * vê o celular virar escuro vê o aplicativo virar junto — porque o que fica
 * gravado é a palavra "sistema", nunca a cor resultante (§76).
 *
 * A troca acontece no mesmo quadro: o tema inteiro sai de um contexto, e mudar
 * a preferência repinta a árvore. Sem recarregar nada, sem piscar (§75).
 */
export default function Aparencia() {
  const { preference, setPreference } = useTheme();

  const escolher = (proximo: ThemePreference) => {
    if (proximo === preference) return;
    haptics.step();
    setPreference(proximo);
    registrar({ nome: 'tema_alterado', tema: proximo });
  };

  return (
    <TelaDeAjuste titulo="Aparência">
      <Grupo titulo="Tema">
        <Bloco>
          <OpcaoEscolhida
            primeira
            rotulo="Sistema"
            explicacao="Acompanha o ajuste do seu aparelho"
            escolhida={preference === 'system'}
            onPress={() => escolher('system')}
          />
          <OpcaoEscolhida
            rotulo="Claro"
            escolhida={preference === 'light'}
            onPress={() => escolher('light')}
          />
          <OpcaoEscolhida
            rotulo="Escuro"
            escolhida={preference === 'dark'}
            onPress={() => escolher('dark')}
          />
        </Bloco>
      </Grupo>

      <Nota>
        Sua escolha fica guardada neste aparelho e continua valendo depois de fechar o aplicativo —
        inclusive se você sair da conta e entrar de novo.
      </Nota>
    </TelaDeAjuste>
  );
}
