import { useEffect, useState } from 'react';

import { Alternador, Grupo, Nota } from '@/perfil/componentes';
import { CarregandoEdicao, TelaDeEdicao, useEdicao } from '@/perfil/edicao';
import { telefoneLegivel } from '@/perfil/tipos';
import {
  erroDeEmail,
  erroDeInstagram,
  erroDeSite,
  erroDeTelefone,
  mascaraTelefone,
  normalizarInstagram,
  normalizarSite,
  paraE164,
} from '@/perfil/validacao';
import { Text, TextField } from '@/ui';

/**
 * Como o morador fala com o parceiro.
 *
 * O WhatsApp é o canal principal em Canaã, e a tela assume isso sem
 * cerimônia: é o primeiro campo, e o telefone é ele mesmo até que se diga o
 * contrário. Ninguém digita o próprio número duas vezes.
 *
 * O e-mail daqui é **comercial**. O da conta serve para entrar no aplicativo e
 * não vira vitrine sozinho — misturar os dois é como o endereço de login de
 * alguém acaba publicado.
 */
export default function Contato() {
  const edicao = useEdicao('contato');

  /**
   * Os campos guardam o que foi digitado; o perfil guarda o normalizado. Os
   * dois precisam existir porque "(94) 991" ainda não é um telefone válido: se
   * a tela lesse só do perfil, o campo se apagaria no meio da digitação.
   *
   * A semente vem por efeito, e não no `useState`: quando a tela abre por link,
   * o perfil ainda não chegou no primeiro render, e um valor inicial vazio
   * ficaria vazio para sempre. Depois do primeiro toque, o que a pessoa digitou
   * manda.
   */
  const [whats, setWhats] = useState('');
  const [fixo, setFixo] = useState('');
  const [tocado, setTocado] = useState(false);

  const whatsSalvo = edicao?.rascunho.contatos.whatsapp ?? null;
  const fixoSalvo = edicao?.rascunho.contatos.telefone ?? null;

  useEffect(() => {
    if (tocado) return;
    setWhats(whatsSalvo ? mascaraTelefone(whatsSalvo) : '');
    setFixo(fixoSalvo ? mascaraTelefone(fixoSalvo) : '');
  }, [whatsSalvo, fixoSalvo, tocado]);

  if (!edicao) return <CarregandoEdicao titulo="Contato" />;

  const { rascunho, mexer } = edicao;
  const c = rascunho.contatos;

  const mexerContato = (parte: Partial<typeof c>) =>
    mexer({ contatos: { ...c, ...parte } });

  const erroWhats = erroDeTelefone(whats);
  const erroFixo = c.telefoneIgualWhatsapp ? null : erroDeTelefone(fixo);
  const erroMail = erroDeEmail(c.email ?? '');
  const erroInsta = erroDeInstagram(c.instagram ?? '');
  const erroDoSite = erroDeSite(c.site ?? '');

  const semContato = !c.whatsapp && !c.telefone;
  const impedimento =
    erroWhats || erroFixo || erroMail || erroInsta || erroDoSite
      ? 'Confira os campos marcados.'
      : semContato
        ? 'Informe ao menos um número para o morador falar com você.'
        : null;

  return (
    <TelaDeEdicao titulo="Contato" edicao={edicao} impedimento={impedimento}>
      <Grupo titulo="WhatsApp">
        <TextField
          label="Número do WhatsApp"
          value={whats}
          onChangeText={(t) => {
            const mascarado = mascaraTelefone(t);
            setTocado(true);
            setWhats(mascarado);
            mexerContato({ whatsapp: paraE164(mascarado) });
          }}
          error={erroWhats}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="(94) 99999-9999"
        />
        <Text variant="caption" tone="muted" maxScale={1.25}>
          É por aqui que o morador vai falar com você depois que você disser que consegue atender.
        </Text>
      </Grupo>

      <Grupo titulo="Telefone">
        <Alternador
          titulo="Meu telefone é o mesmo"
          explicacao="Desligue se você atende ligação em outro número."
          valor={c.telefoneIgualWhatsapp}
          onChange={(v) => {
            mexerContato({ telefoneIgualWhatsapp: v, telefone: v ? null : paraE164(fixo) });
          }}
        />
        {!c.telefoneIgualWhatsapp ? (
          <TextField
            label="Telefone para ligação"
            value={fixo}
            onChangeText={(t) => {
              const mascarado = mascaraTelefone(t);
              setTocado(true);
              setFixo(mascarado);
              mexerContato({ telefone: paraE164(mascarado) });
            }}
            error={erroFixo}
            keyboardType="phone-pad"
            placeholder="(94) 3333-4444"
          />
        ) : c.whatsapp ? (
          <Text variant="caption" tone="faint" maxScale={1.2}>
            Ligações também em {telefoneLegivel(c.whatsapp)}.
          </Text>
        ) : null}
      </Grupo>

      <Grupo titulo="Outros contatos">
        <Text variant="caption" tone="muted" maxScale={1.25}>
          Opcionais. Só preencha o que você realmente acompanha.
        </Text>

        <TextField
          label="E-mail comercial"
          value={c.email ?? ''}
          onChangeText={(t) => mexerContato({ email: t.trim() || null })}
          error={erroMail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="contato@suaempresa.com.br"
        />

        <TextField
          label="Instagram"
          value={c.instagram ?? ''}
          onChangeText={(t) => mexerContato({ instagram: normalizarInstagram(t) })}
          error={erroInsta}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="@suaempresa"
        />

        <TextField
          label="Site"
          value={c.site ?? ''}
          onChangeText={(t) => mexerContato({ site: t.trim() ? normalizarSite(t) : null })}
          error={erroDoSite}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="suaempresa.com.br"
        />
      </Grupo>

      <Nota>
        Seu número aparece para o morador quando você diz que consegue atender uma oportunidade —
        não antes disso.
      </Nota>
    </TelaDeEdicao>
  );
}
