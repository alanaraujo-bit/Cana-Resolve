/**
 * Inspeção automatizada do Operations.
 *
 * Sobe um Edge sem interface, entra de verdade com e-mail e senha e percorre
 * as telas em várias larguras e nos dois temas, procurando três coisas que
 * um `tsc` limpo nunca encontraria:
 *
 *   1. rolagem horizontal — conteúdo escapando para os lados;
 *   2. erros de console e requisições que falharam;
 *   3. o que a tela realmente parece, em imagem.
 *
 * Uso:
 *   node scripts/inspect.mjs                     # tudo, sem imagens
 *   node scripts/inspect.mjs --shot              # salva PNGs em .inspect/
 *   node scripts/inspect.mjs --rota=/ops/comercial
 */
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = process.env.INSPECT_BASE ?? "http://localhost:3000";
const PORTA_CDP = 9333;

const args = process.argv.slice(2);
const salvarImagens = args.includes("--shot");
// A rota pode vir por variável de ambiente: no Git Bash do Windows, um
// argumento começando com "/" é convertido em caminho de arquivo.
const rotaUnica =
  process.env.INSPECT_ROTA ?? args.find((a) => a.startsWith("--rota="))?.slice(7);

const ROTAS_PUBLICAS = [
  "/",
  "/solicitar",
  "/parceiros",
  "/entrar",
  "/termos",
  "/privacidade",
  // Sem sessão nenhuma — nem formulário de login (o morador não tem um) nem
  // dado nenhum ainda. Cobertas aqui porque não dependem de fixture nenhuma.
  "/acompanhar",
  "/parceiro/entrar",
];

const ROTAS = rotaUnica
  ? [rotaUnica]
  : args.includes("--publico")
  ? ROTAS_PUBLICAS
  : [
      "/ops",
      "/ops/solicitacoes",
      "/ops/comercial",
      "/ops/comercial/novo",
      "/ops/cadastros",
      "/ops/parceiros",
      "/ops/oportunidades",
      "/ops/catalogo",
      "/ops/analytics",
      "/ops/config",
    ];

const LARGURAS = rotaUnica ? [390, 1440] : [320, 390, 768, 1440];
const TEMAS = ["light", "dark"];

function lerEnvLocal() {
  try {
    return readFileSync(".env.local", "utf8");
  } catch {
    return "";
  }
}

function credenciais() {
  const env = lerEnvLocal();
  const pega = (chave) =>
    env.match(new RegExp(`^${chave}=(.*)$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
  return {
    email: process.env.OPS_EMAIL ?? pega("OPS_EMAIL"),
    senha: process.env.OPS_SENHA ?? pega("OPS_SENHA"),
    databaseUrl: process.env.DATABASE_URL ?? pega("DATABASE_URL"),
    sessionSecret: process.env.CR_SESSION_SECRET ?? pega("CR_SESSION_SECRET"),
  };
}

/**
 * O mesmo HMAC de `lib/auth/audience.ts`, reimplementado aqui porque este
 * script roda como Node puro — sem o runtime do Next, que é onde
 * `server-only` faria sentido. Serve só para montar o cookie de morador sem
 * precisar passar pelo formulário de `/solicitar` a cada inspeção.
 */
function assinarTokenMorador(whatsapp, segredo) {
  const payload = Buffer.from(
    JSON.stringify({ w: whatsapp, exp: Date.now() + 730 * 86_400_000 }),
  ).toString("base64url");
  const assinatura = createHmac("sha256", segredo).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
}

/* ---------------------------------------------------------------
   CDP mínimo
   --------------------------------------------------------------- */

class Cdp {
  #ws;
  #id = 0;
  #pendentes = new Map();
  eventos = [];

  static async conectar(url) {
    const cdp = new Cdp();
    cdp.#ws = new WebSocket(url);
    await new Promise((ok, falha) => {
      cdp.#ws.addEventListener("open", ok, { once: true });
      cdp.#ws.addEventListener("error", falha, { once: true });
    });
    cdp.#ws.addEventListener("message", (evento) => {
      const dados = JSON.parse(evento.data);
      if (dados.id && cdp.#pendentes.has(dados.id)) {
        const { ok, falha } = cdp.#pendentes.get(dados.id);
        cdp.#pendentes.delete(dados.id);
        if (dados.error) falha(new Error(dados.error.message));
        else ok(dados.result);
      } else if (dados.method) {
        cdp.eventos.push(dados);
      }
    });
    return cdp;
  }

  envia(method, params = {}) {
    const id = ++this.#id;
    this.#ws.send(JSON.stringify({ id, method, params }));

    // Sem prazo, um navegador que morre no meio deixa a promessa pendente
    // para sempre — e o processo trava sem dizer o porquê.
    return new Promise((ok, falha) => {
      const prazo = setTimeout(() => {
        this.#pendentes.delete(id);
        falha(new Error(`O navegador não respondeu a ${method} em 20s.`));
      }, 20_000);

      this.#pendentes.set(id, {
        ok: (v) => {
          clearTimeout(prazo);
          ok(v);
        },
        falha: (e) => {
          clearTimeout(prazo);
          falha(e);
        },
      });
    });
  }

  async avalia(expressao) {
    const r = await this.envia("Runtime.evaluate", {
      expression: expressao,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
      );
    }
    return r.result.value;
  }

  fecha() {
    this.#ws.close();
  }
}

async function alvoDaPagina() {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    try {
      const lista = await fetch(`http://127.0.0.1:${PORTA_CDP}/json/list`).then((r) =>
        r.json(),
      );
      const pagina = lista.find((t) => t.type === "page");
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch {
      /* o navegador ainda está subindo */
    }
    await sleep(300);
  }
  throw new Error("O Edge não respondeu na porta de depuração.");
}

async function irPara(cdp, url) {
  cdp.eventos.length = 0;
  const destino = new URL(url).pathname;
  await cdp.envia("Page.navigate", { url });

  // Esperar só por `readyState` não basta: por um instante o documento antigo
  // ainda está lá, completo — e a medição sairia da página errada. O caminho
  // precisa bater antes de qualquer leitura.
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    const estado = await cdp
      .avalia("[location.pathname, document.readyState].join('|')")
      .catch(() => "");
    const [caminho, pronto] = String(estado).split("|");
    if (caminho === destino && pronto === "complete") break;
  }
  await sleep(400);
}

async function medir(cdp) {
  return cdp.avalia(`(() => {
    const de = document.documentElement;
    const excedentes = [];
    if (de.scrollWidth > de.clientWidth + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > de.clientWidth + 1 || r.left < -1) {
          excedentes.push(
            (el.tagName.toLowerCase()) +
            (el.className && typeof el.className === 'string'
              ? '.' + el.className.split(/\\s+/).slice(0, 3).join('.')
              : '') +
            ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']'
          );
        }
        if (excedentes.length >= 4) break;
      }
    }
    return {
      overflow: de.scrollWidth - de.clientWidth,
      excedentes,
      titulo: document.title,
      textoInicial: (document.querySelector('h1')?.textContent || '').trim().slice(0, 70),
      vazio: document.body.innerText.trim().length < 40,
      diagnostico: (() => {
        const alvo = [...document.querySelectorAll("[class*='grid-cols']")].slice(0, 3);
        return alvo.map(
          (el) =>
            getComputedStyle(el).gridTemplateColumns.split(" ").length +
            " col :: " +
            String(el.className).slice(0, 60),
        );
      })(),
    };
  })()`);
}

/* ---------------------------------------------------------------
   Execução
   --------------------------------------------------------------- */

const { email, senha, databaseUrl, sessionSecret } = credenciais();
if (!email || !senha) {
  console.error(
    "Defina OPS_EMAIL e OPS_SENHA (no ambiente ou no .env.local) para a inspeção entrar no sistema.",
  );
  process.exit(1);
}

// O perfil fica fora do projeto: o Edge recusa um diretório de dados dentro
// de um caminho com acentos, e "Canaã" tem um.
const perfil = join(tmpdir(), "cr-inspect-perfil");
mkdirSync(perfil, { recursive: true });
if (salvarImagens) mkdirSync(".inspect/telas", { recursive: true });

const edge = spawn(EDGE, [
  "--headless=new",
  `--remote-debugging-port=${PORTA_CDP}`,
  `--user-data-dir=${perfil}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--hide-scrollbars",
  "about:blank",
], { detached: false, stdio: "ignore" });
edge.on("error", (e) => {
  console.error("Não deu para abrir o Edge:", e.message);
  process.exit(1);
});

const cdp = await Cdp.conectar(await alvoDaPagina());
await cdp.envia("Page.enable");
await cdp.envia("Runtime.enable");
await cdp.envia("Log.enable");
await cdp.envia("Network.enable");

const problemas = [];

function coletarErros(rota, contexto) {
  for (const evento of cdp.eventos) {
    if (evento.method === "Runtime.exceptionThrown") {
      problemas.push(
        `${rota} ${contexto}: exceção — ${evento.params.exceptionDetails?.exception?.description?.split(String.fromCharCode(10))[0] ?? evento.params.exceptionDetails?.text ?? "?"}`,
      );
    }
    if (
      evento.method === "Log.entryAdded" &&
      evento.params.entry.level === "error" &&
      // O favicon ausente em ambiente de desenvolvimento não é problema real.
      !/favicon/i.test(evento.params.entry.text)
    ) {
      problemas.push(`${rota} ${contexto}: console — ${evento.params.entry.text}`);
    }
    if (evento.method === "Network.responseReceived") {
      const { status, url } = evento.params.response;
      if (status >= 400 && !url.includes("favicon")) {
        problemas.push(`${rota} ${contexto}: ${status} em ${url.replace(BASE, "")}`);
      }
    }
  }
  cdp.eventos.length = 0;
}

// ---- entrar ----
await cdp.envia("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await irPara(cdp, `${BASE}/ops/entrar`);
// Espera a hidratação: antes dela, enviar o formulário faria um POST nativo
// que não chega em Server Action nenhuma.
for (let i = 0; i < 60; i++) {
  const pronto = await cdp
    .avalia("!!document.querySelector('form') && !!window.next")
    .catch(() => false);
  if (pronto) break;
  await sleep(300);
}
await sleep(800);

// A sessão pode ter sobrevivido de uma rodada anterior: nesse caso o porteiro
// já mandou a gente para dentro e não há formulário nenhum para preencher.
const precisaEntrar = await cdp.avalia("location.pathname.includes('entrar')");
if (precisaEntrar) {
await cdp.avalia(`(() => {
  const set = (sel, valor) => {
    const el = document.querySelector(sel);
    const proto = Object.getPrototypeOf(el);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('#email', ${JSON.stringify(email)});
  set('#senha', ${JSON.stringify(senha)});
  document.querySelector('form').requestSubmit();
})()`);

  let destino = "/ops/entrar";
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    destino = await cdp.avalia("location.pathname").catch(() => "/ops/entrar");
    if (!destino.includes("entrar")) break;
    const alerta = await cdp
      .avalia("document.querySelector('[role=alert]')?.textContent ?? ''")
      .catch(() => "");
    if (alerta) break;
  }

  if (destino.includes("entrar")) {
    const erro = await cdp.avalia(
      "document.querySelector('[role=alert]')?.textContent ?? 'sem mensagem'",
    );
    console.error(`Não consegui entrar: ${erro}`);
    cdp.fecha();
    edge.kill();
    process.exit(1);
  }
  console.log("Entrou no Operations.\n");
} else {
  console.log("Sessão anterior ainda válida.\n");
}
cdp.eventos.length = 0;

// ---- percorrer ----
for (const tema of TEMAS) {
  await cdp.avalia(
    // `data-theme-pref` também, e não só `data-theme`: é o que `ThemeToggle`
    // lê para saber qual botão destacar (components/theme.tsx). Sem isto, a
    // troca de tema pinta a página certo, mas a captura mostra o seletor de
    // tema com o botão errado marcado.
    `document.documentElement.setAttribute('data-theme', '${tema}');
     document.documentElement.setAttribute('data-theme-pref', '${tema}');
     localStorage.setItem('cr-theme', '${tema}');`,
  );

  for (const largura of LARGURAS) {
    await cdp.envia("Emulation.setDeviceMetricsOverride", {
      width: largura,
      height: largura < 500 ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: largura < 500,
    });

    for (const rota of ROTAS) {
      await visitarRota(rota, largura, tema);
    }
  }
}

/**
 * O corpo de uma visita — extraído para ser reaproveitado pelas varreduras do
 * Portal do Parceiro e do Portal do Morador, mais abaixo. A sessão muda (ops,
 * parceiro ou morador); a checagem de overflow, console e captura é a mesma.
 */
async function visitarRota(rota, largura, tema) {
  await irPara(cdp, `${BASE}${rota}`);
  await cdp.avalia(`document.documentElement.setAttribute('data-theme', '${tema}')`);
  await sleep(200);

  const medida = await medir(cdp);
  const contexto = `${largura}px ${tema}`;

  if (medida.overflow > 1) {
    problemas.push(
      `${rota} ${contexto}: rolagem horizontal de ${medida.overflow}px — ${medida.excedentes.join(" | ")}`,
    );
  }
  if (medida.vazio) problemas.push(`${rota} ${contexto}: página praticamente vazia`);

  coletarErros(rota, contexto);

  if (salvarImagens && largura !== 768) {
    const { data } = await cdp.envia("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    const nome = `${rota.replace(/\//g, "_") || "_raiz"}-${largura}-${tema}.png`;
    writeFileSync(`.inspect/telas/${nome}`, Buffer.from(data, "base64"));
  }

  console.log(
    `${medida.overflow > 1 ? "✗" : "·"} ${rota.padEnd(28)} ${String(largura).padStart(4)}px ${tema.padEnd(5)} ${medida.textoInicial}`,
  );
  if (process.env.INSPECT_DEBUG) console.log("   ", medida.diagnostico);
}

/* ---------------------------------------------------------------
   Portal do Parceiro e Portal do Morador — só na varredura completa,
   e só quando existir dado de demonstração para entrar de verdade
   (`npm run demo:popular`). Sem isso, não há "oportunidade" nem
   "solicitação" real para abrir, e a inspeção pula esta parte avisando —
   não é uma falha, é a ausência de fixture.
   --------------------------------------------------------------- */

if (!rotaUnica && !args.includes("--publico") && databaseUrl) {
  const cliente = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await cliente.connect();

  const { rows: parceiroRows } = await cliente.query(`
    select p.code, p.whatsapp, o.id::text as oportunidade_id
    from partners p
    join opportunities o on o.partner_id = p.id
    order by o.created_at desc
    limit 1
  `);
  const { rows: pedidoRows } = await cliente.query(`
    select whatsapp, id::text as id from service_requests order by created_at desc limit 1
  `);
  await cliente.end();

  const parceiroDemo = parceiroRows[0];
  const pedidoDemo = pedidoRows[0];

  if (parceiroDemo) {
    await cdp.envia("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await irPara(cdp, `${BASE}/parceiro/entrar`);
    // O perfil do Edge sobrevive entre execuções (mesmo diretório em
    // `tmpdir()`): se uma rodada anterior já deixou o cookie do parceiro
    // gravado, o proxy já redirecionou para `/parceiro` antes do formulário
    // existir — tentar preencher `#codigo` quebraria em vez de só pular o
    // login, igual à sessão do Operations já trata mais abaixo.
    const precisaEntrarParceiro = await cdp.avalia("location.pathname.includes('entrar')");
    if (precisaEntrarParceiro) {
      await cdp.avalia(`(() => {
        const set = (sel, valor) => {
          const el = document.querySelector(sel);
          const proto = Object.getPrototypeOf(el);
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        set('#codigo', ${JSON.stringify(parceiroDemo.code)});
        set('#telefone', ${JSON.stringify(parceiroDemo.whatsapp)});
        document.querySelector('form').requestSubmit();
      })()`);
      for (let i = 0; i < 30; i++) {
        await sleep(300);
        if (!(await cdp.avalia("location.pathname.includes('entrar')"))) break;
      }
    }

    if (await cdp.avalia("location.pathname.includes('entrar')")) {
      // Diferente de "sem dado nenhum" (linha abaixo): aqui existe um
      // parceiro de demonstração e o login falhou mesmo assim — real o
      // bastante para não silenciar. (Se você rodou a inspeção várias vezes
      // seguidas, o freio de tentativas por código pode ser a causa — ver
      // lib/auth/audience.ts.)
      problemas.push(
        "Portal do Parceiro: login do parceiro de demonstração falhou — varredura pulada. Confira se o freio de tentativas (lib/rate-limit.ts) não foi atingido por execuções repetidas.",
      );
      console.log("✗ Não consegui entrar como parceiro de demonstração — pulando a varredura do Portal do Parceiro.\n");
    } else {
      const rotasParceiro = [
        "/parceiro",
        "/parceiro/oportunidades",
        `/parceiro/oportunidades/${parceiroDemo.oportunidade_id}`,
        "/parceiro/perfil",
        "/parceiro/notificacoes",
      ];
      for (const tema of TEMAS) {
        await cdp.avalia(`document.documentElement.setAttribute('data-theme', '${tema}'); document.documentElement.setAttribute('data-theme-pref', '${tema}'); localStorage.setItem('cr-theme', '${tema}');`);
        for (const largura of LARGURAS) {
          await cdp.envia("Emulation.setDeviceMetricsOverride", { width: largura, height: largura < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: largura < 500 });
          for (const rota of rotasParceiro) await visitarRota(rota, largura, tema);
        }
      }
    }
  } else {
    console.log("Sem parceiro de demonstração com oportunidade — pulando a varredura do Portal do Parceiro. Rode `npm run demo:popular`.\n");
  }

  if (pedidoDemo && sessionSecret) {
    const token = assinarTokenMorador(pedidoDemo.whatsapp, sessionSecret);
    // O cookie é httpOnly: só o protocolo de depuração consegue gravá-lo,
    // `document.cookie` não alcança.
    await cdp.envia("Network.setCookie", {
      name: "cr_morador_acesso",
      value: token,
      url: BASE,
      httpOnly: true,
      secure: BASE.startsWith("https"),
      path: "/",
    });

    const rotasMorador = ["/acompanhar", `/acompanhar/${pedidoDemo.id}`, "/acompanhar/notificacoes"];
    for (const tema of TEMAS) {
      await cdp.avalia(`document.documentElement.setAttribute('data-theme', '${tema}'); document.documentElement.setAttribute('data-theme-pref', '${tema}'); localStorage.setItem('cr-theme', '${tema}');`);
      for (const largura of LARGURAS) {
        await cdp.envia("Emulation.setDeviceMetricsOverride", { width: largura, height: largura < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: largura < 500 });
        for (const rota of rotasMorador) await visitarRota(rota, largura, tema);
      }
    }
  } else if (!sessionSecret) {
    // Numa produção configurada, essa variável tem que existir — sinaliza
    // como problema, não como um "não se aplica".
    problemas.push("CR_SESSION_SECRET ausente — varredura do Portal do Morador pulada.");
    console.log("✗ CR_SESSION_SECRET ausente — pulando a varredura do Portal do Morador.\n");
  } else {
    console.log("Sem solicitação de demonstração — pulando a varredura do Portal do Morador. Rode `npm run demo:popular`.\n");
  }
}

cdp.fecha();
edge.kill();

console.log("");
if (problemas.length === 0) {
  console.log("Nenhum overflow, nenhum erro de console, nenhuma resposta com falha.");
} else {
  console.log(`${problemas.length} problema(s):`);
  for (const p of problemas) console.log("  - " + p);
  process.exitCode = 1;
}
