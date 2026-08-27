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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

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

function credenciais() {
  const env = readFileSync(".env.local", "utf8");
  const pega = (chave) =>
    env.match(new RegExp(`^${chave}=(.*)$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
  return {
    email: process.env.OPS_EMAIL ?? pega("OPS_EMAIL"),
    senha: process.env.OPS_SENHA ?? pega("OPS_SENHA"),
  };
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

const { email, senha } = credenciais();
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
    `document.documentElement.setAttribute('data-theme', '${tema}');
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
      await irPara(cdp, `${BASE}${rota}`);
      await cdp.avalia(
        `document.documentElement.setAttribute('data-theme', '${tema}')`,
      );
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
        `${medida.overflow > 1 ? "✗" : "·"} ${rota.padEnd(24)} ${String(largura).padStart(4)}px ${tema.padEnd(5)} ${medida.textoInicial}`,
      );
      if (process.env.INSPECT_DEBUG) console.log("   ", medida.diagnostico);
    }
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
