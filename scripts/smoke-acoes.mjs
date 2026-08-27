/**
 * Prova, pelo navegador, o que teste de unidade não alcança.
 *
 * Duas metades:
 *
 * 1. **Os formulários públicos.** É a verificação mais importante do
 *    repositório, porque é a única coisa que pode apodrecer sem ninguém
 *    perceber: por contrato, se a gravação falhar, o WhatsApp abre do mesmo
 *    jeito e a tela não muda. Um formulário que parou de gravar parece
 *    perfeito. Aqui a prova é o registro aparecendo no banco.
 *
 * 2. **As ações do Operations.** Formulário → Server Action → domínio → banco
 *    → revalidação → tela com o estado novo. Uma prop que não atravessa a
 *    fronteira servidor/cliente não aparece no `tsc`; aparece em produção.
 *
 * **Só mexe no que ele mesmo cria.** Todos os registros nascem aqui, com
 * telefones reservados, e são apagados no fim. Nenhum dado real é tocado —
 * por isso é seguro rodar contra produção, que é onde a verificação vale.
 *
 *   npm run smoke
 *   INSPECT_BASE=https://canaaresolve.aionixdev.com npm run smoke
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = process.env.INSPECT_BASE ?? "http://localhost:3000";
const PORTA = 9339;

/** Faixa reservada para verificação. Nunca vai existir de verdade em Canaã. */
const TEL_MORADOR = "(94) 90000-0009";
const TEL_EMPRESA = "(94) 90000-0008";
const DIGITOS = ["5594900000009", "5594900000008"];

function env() {
  const texto = readFileSync(".env.local", "utf8");
  const pega = (k) =>
    process.env[k] ??
    texto.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
  return { url: pega("DATABASE_URL"), email: pega("OPS_EMAIL"), senha: pega("OPS_SENHA") };
}

const { url, email, senha } = env();
const sql = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await sql.connect();

const falhas = [];
function conferir(nome, ok, detalhe = "") {
  console.log(`${ok ? "✔" : "✗"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas.push(nome);
}

/** Espera uma condição no banco: a gravação é assíncrona por contrato. */
async function esperar(consulta, valores, ok, tentativas = 30) {
  for (let i = 0; i < tentativas; i++) {
    const r = await sql.query(consulta, valores);
    if (ok(r.rows)) return r.rows;
    await sleep(500);
  }
  return null;
}

async function faxina() {
  // Ordem importa: histórico e encaminhamentos antes dos registros que eles
  // apontam. `cascade` cuidaria, mas ser explícito deixa claro o que sai.
  await sql.query(
    `delete from activities where subject_id in (
       select id from service_requests where whatsapp = any($1)
       union select id from partner_applications where whatsapp = any($1)
       union select id from prospects where whatsapp = any($1))`,
    [DIGITOS],
  );
  await sql.query(
    `delete from interactions where subject_id in (
       select id from service_requests where whatsapp = any($1))`,
    [DIGITOS],
  );
  await sql.query("delete from service_requests where whatsapp = any($1)", [DIGITOS]);
  await sql.query("delete from partner_applications where whatsapp = any($1)", [DIGITOS]);
  await sql.query("delete from prospects where whatsapp = any($1)", [DIGITOS]);
}

await faxina();

/* ---------------------------------------------------------------
   Navegador
   --------------------------------------------------------------- */

const perfil = join(tmpdir(), "cr-smoke-perfil");
mkdirSync(perfil, { recursive: true });
const edge = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let alvo;
for (let i = 0; i < 40 && !alvo; i++) {
  await sleep(300);
  try {
    const lista = await fetch(`http://127.0.0.1:${PORTA}/json/list`).then((r) => r.json());
    alvo = lista.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {
    /* subindo */
  }
}
if (!alvo) {
  console.error("O Edge não respondeu na porta de depuração.");
  process.exit(1);
}

const ws = new WebSocket(alvo);
await new Promise((ok) => ws.addEventListener("open", ok, { once: true }));

let id = 0;
const pendentes = new Map();
ws.addEventListener("message", (e) => {
  const d = JSON.parse(e.data);
  if (d.id && pendentes.has(d.id)) {
    pendentes.get(d.id)(d);
    pendentes.delete(d.id);
  }
});

function envia(method, params = {}) {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((ok, falha) => {
    const prazo = setTimeout(() => falha(new Error(`${method} não respondeu`)), 25_000);
    pendentes.set(i, (d) => {
      clearTimeout(prazo);
      if (d.error) falha(new Error(d.error.message));
      else ok(d.result);
    });
  });
}

async function js(expr) {
  const r = await envia("Runtime.evaluate", {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r.result.value;
}

/**
 * Segura o link do WhatsApp sem tirar o clique de React.
 *
 * `preventDefault` na fase de captura impede a aba de abrir; como não
 * interrompe a propagação, o `onClick` do formulário — que é quem grava — roda
 * exatamente como rodaria para uma pessoa. Remover o `target` faria a página
 * navegar para o `wa.me` e a tela de confirmação nunca apareceria.
 */
const segurarWhatsApp = `(() => {
  window.open = () => null;
  document.addEventListener(
    "click",
    (e) => {
      const alvo = e.target;
      if (alvo instanceof Element && alvo.closest('a[href^="https://wa.me"]')) {
        e.preventDefault();
      }
    },
    true,
  );
  return true;
})()`;

/** Escreve num campo controlado por React sem que ele ignore o valor. */
const preencher = (sel, valor) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return false;
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(valor)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

async function abrir(caminho) {
  await envia("Page.navigate", { url: BASE + caminho });
  const destino = caminho.split("?")[0];
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    const estado = await js("[location.pathname, document.readyState].join('|')").catch(() => "");
    const [p, pronto] = String(estado).split("|");
    if (p === destino && pronto === "complete") break;
  }
  // Antes da hidratação, enviar o formulário faz um POST nativo que não chega
  // a lugar nenhum — e o teste passaria sem testar nada.
  for (let i = 0; i < 40; i++) {
    if (await js("!!window.next").catch(() => false)) break;
    await sleep(250);
  }
  await sleep(900);
}

await envia("Page.enable");
await envia("Runtime.enable");
await envia("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

console.log(`Verificando ${BASE}\n`);

/* ---------------------------------------------------------------
   1. /solicitar — o pedido do morador
   --------------------------------------------------------------- */

await abrir("/solicitar");

await js(preencher("#descricao", "Verificacao automatica: o ar-condicionado nao esta gelando."));
await js(preencher("#nome", "Verificacao Automatica"));
await js(preencher("#telefone", TEL_MORADOR));
await js(`(() => {
  const c = document.querySelector('#consent');
  if (c && !c.checked) c.click();
  return c?.checked ?? false;
})()`);

// O envio é um link para o WhatsApp: bloqueamos a abertura da aba para o
// navegador de verificação não sair da página.
await js(segurarWhatsApp);

const enviouPedido = await js(`(() => {
  const btn = [...document.querySelectorAll('button, a')]
    .find(b => /enviar pedido pelo whatsapp/i.test(b.textContent));
  if (!btn) return false;
  btn.click();
  return true;
})()`);
conferir("o formulário de /solicitar aceita o envio", enviouPedido);

const pedido = await esperar(
  "select id::text, code from service_requests where whatsapp = $1",
  [DIGITOS[0]],
  (r) => r.length > 0,
);
conferir(
  "a solicitação foi gravada antes do WhatsApp",
  Boolean(pedido),
  pedido ? pedido[0].code : "nada chegou ao banco",
);

if (pedido) {
  await sleep(1200);
  const mostrouCodigo = await js(
    `document.body.innerText.includes(${JSON.stringify(pedido[0].code)})`,
  );
  conferir("a tela de confirmação mostra o código do pedido", mostrouCodigo, pedido[0].code);
}

/* ---------------------------------------------------------------
   2. /parceiros — o cadastro da empresa
   --------------------------------------------------------------- */

await abrir("/parceiros");

await js(preencher("#nome", "Responsavel Verificacao"));
await js(preencher("#empresa", "Empresa de Verificacao"));
await js(preencher("#telefone", TEL_EMPRESA));
await js(`(() => {
  const b = [...document.querySelectorAll('button')]
    .find(x => /ar-condicionado/i.test(x.textContent));
  if (b) { b.click(); return true; }
  return false;
})()`);

await js(segurarWhatsApp);

const enviouCadastro = await js(`(() => {
  const btn = [...document.querySelectorAll('button, a')]
    .find(b => /enviar meu interesse/i.test(b.textContent));
  if (!btn) return false;
  btn.click();
  return true;
})()`);
conferir("o formulário de /parceiros aceita o envio", enviouCadastro);

const cadastro = await esperar(
  "select id::text, prospect_id::text from partner_applications where whatsapp = $1",
  [DIGITOS[1]],
  (r) => r.length > 0,
);
conferir("o cadastro foi gravado antes do WhatsApp", Boolean(cadastro));
conferir(
  "o cadastro entrou no funil comercial",
  Boolean(cadastro?.[0]?.prospect_id),
  cadastro?.[0]?.prospect_id ? "prospect criado" : "sem prospect",
);

/* ---------------------------------------------------------------
   3. O Operations agindo sobre o pedido que acabou de entrar
   --------------------------------------------------------------- */

if (pedido) {
  await abrir("/ops/entrar");
  if (await js("location.pathname.includes('entrar')")) {
    await js(preencher("#email", email));
    await js(preencher("#senha", senha));
    await js(`document.querySelector('form').requestSubmit()`);
    for (let i = 0; i < 40; i++) {
      await sleep(400);
      if (!(await js("location.pathname.includes('entrar')"))) break;
    }
  }
  conferir("entrar no Operations", !(await js("location.pathname.includes('entrar')")));

  await abrir(`/ops/solicitacoes/${pedido[0].id}`);

  const apareceu = await js(`(() => {
    const b = [...document.querySelectorAll('button')]
      .find(x => x.textContent.trim() === 'Cancelada');
    if (!b) return false;
    b.click();
    return true;
  })()`);
  conferir("o destino permitido aparece na tela", apareceu);

  await sleep(400);
  conferir(
    "a máquina de estados exige o motivo",
    await js(`!!document.querySelector('input[name="motivo"], select[name="motivo"]')`),
  );

  await js(preencher('input[name="motivo"]', "Verificação automática."));
  await js(`[...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === 'Confirmar')?.click()`);

  const mudou = await esperar(
    "select status, close_reason from service_requests where id = $1",
    [pedido[0].id],
    (r) => r[0]?.status === "cancelada",
  );
  conferir("a Server Action mudou o estado no banco", Boolean(mudou));
  conferir("o motivo foi gravado", Boolean(mudou?.[0]?.close_reason), mudou?.[0]?.close_reason ?? "");
  conferir(
    "a tela voltou refletindo a mudança",
    await js(`document.body.innerText.toLowerCase().includes('cancelada')`),
  );

  await js(preencher('textarea[name="corpo"]', "Anotação da verificação automática."));
  await js(`document.querySelector('textarea[name="corpo"]').closest('form').requestSubmit()`);
  conferir(
    "a anotação foi registrada",
    Boolean(
      await esperar(
        "select 1 from interactions where subject_id = $1",
        [pedido[0].id],
        (r) => r.length > 0,
      ),
    ),
  );
}

/* ---------------------------------------------------------------
   Faxina
   --------------------------------------------------------------- */

ws.close();
edge.kill();
await faxina();

const sobrou = await sql.query(
  `select
     (select count(*) from service_requests where whatsapp = any($1))::int +
     (select count(*) from partner_applications where whatsapp = any($1))::int +
     (select count(*) from prospects where whatsapp = any($1))::int as n`,
  [DIGITOS],
);
conferir("nada de teste ficou no banco", sobrou.rows[0].n === 0, `${sobrou.rows[0].n} restante(s)`);

await sql.end();

console.log("");
if (falhas.length === 0) {
  console.log("Tudo respondeu: formulários públicos gravando e ações do Operations agindo.");
} else {
  console.log(`${falhas.length} falha(s): ${falhas.join(", ")}`);
}
process.exit(falhas.length === 0 ? 0 : 1);
