/**
 * Prova que as ações do Operations funcionam pelo navegador.
 *
 * Os testes de fluxo (`npm test`) provam o domínio; este script prova a
 * ligação — formulário, Server Action, revalidação e a tela voltando com o
 * estado novo. É a parte que um teste de unidade não alcança e que quebra
 * calada: uma prop que não atravessa a fronteira entre servidor e cliente não
 * aparece em `tsc`, aparece em produção.
 *
 *   node scripts/smoke-acoes.mjs
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

function env() {
  const texto = readFileSync(".env.local", "utf8");
  const pega = (k) =>
    process.env[k] ?? texto.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
  return { url: pega("DATABASE_URL"), email: pega("OPS_EMAIL"), senha: pega("OPS_SENHA") };
}

const { url, email, senha } = env();
const sql = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await sql.connect();

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

async function abrir(caminho) {
  await envia("Page.navigate", { url: BASE + caminho });
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    const pronto = await js("[location.pathname, document.readyState].join('|')").catch(() => "");
    const [p, estado] = String(pronto).split("|");
    if (p === caminho.split("?")[0] && estado === "complete") break;
  }
  // Espera a hidratação: sem ela, o formulário faz um POST nativo que não
  // chega a Server Action nenhuma.
  for (let i = 0; i < 40; i++) {
    if (await js("!!window.next").catch(() => false)) break;
    await sleep(250);
  }
  await sleep(900);
}

const falhas = [];
function conferir(nome, ok, detalhe = "") {
  console.log(`${ok ? "✔" : "✗"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas.push(nome);
}

await envia("Page.enable");
await envia("Runtime.enable");
await envia("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

// ---- entrar ----
await abrir("/ops/entrar");
if (await js("location.pathname.includes('entrar')")) {
  await js(`(() => {
    const set = (sel, v) => {
      const el = document.querySelector(sel);
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('#email', ${JSON.stringify(email)});
    set('#senha', ${JSON.stringify(senha)});
    document.querySelector('form').requestSubmit();
  })()`);
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    if (!(await js("location.pathname.includes('entrar')"))) break;
  }
}
conferir("entrar no Operations", !(await js("location.pathname.includes('entrar')")));

// ---- um pedido para mexer ----
const { rows } = await sql.query(
  "select id::text, code, status from service_requests where status = 'nova' or status = 'em_triagem' order by code limit 1",
);
if (rows.length === 0) {
  console.log("Nenhuma solicitação aberta para exercitar. Rode `npm run demo:popular`.");
  process.exit(0);
}
const pedido = rows[0];

// ---- 1. mudança de estado, com o campo que a máquina exige ----
await abrir(`/ops/solicitacoes/${pedido.id}`);

const temBotao = await js(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Cancelada');
  if (!b) return false;
  b.click();
  return true;
})()`);
conferir("o destino 'Cancelada' aparece", temBotao);

await sleep(400);
const pediuMotivo = await js(
  `!!document.querySelector('input[name=\"motivo\"], select[name=\"motivo\"]')`,
);
conferir("a máquina de estados pede o motivo", pediuMotivo);

await js(`(() => {
  const campo = document.querySelector('input[name="motivo"]');
  if (campo) {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value')
      .set.call(campo, 'Fumaça: verificação automática.');
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }
  [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === 'Confirmar')?.click();
})()`);

let virou = false;
for (let i = 0; i < 30; i++) {
  await sleep(500);
  const r = await sql.query("select status, close_reason from service_requests where id = $1", [
    pedido.id,
  ]);
  if (r.rows[0].status === "cancelada") {
    virou = true;
    conferir("o motivo foi gravado", Boolean(r.rows[0].close_reason), r.rows[0].close_reason ?? "");
    break;
  }
}
conferir("a Server Action mudou o estado no banco", virou);

const avisoNaTela = await js(
  `document.body.innerText.includes('Cancelada') || document.body.innerText.includes('cancelada')`,
);
conferir("a tela voltou refletindo a mudança", avisoNaTela);

// ---- 2. registro de interação ----
await abrir(`/ops/solicitacoes/${pedido.id}`);
const antes = Number(
  (await sql.query("select count(*)::int as n from interactions where subject_id = $1", [pedido.id]))
    .rows[0].n,
);

await js(`(() => {
  const t = document.querySelector('textarea[name="corpo"]');
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(t), 'value')
    .set.call(t, 'Anotação criada pela verificação automática.');
  t.dispatchEvent(new Event('input', { bubbles: true }));
  t.closest('form').requestSubmit();
})()`);

let anotou = false;
for (let i = 0; i < 30; i++) {
  await sleep(500);
  const n = Number(
    (await sql.query("select count(*)::int as n from interactions where subject_id = $1", [pedido.id]))
      .rows[0].n,
  );
  if (n > antes) {
    anotou = true;
    break;
  }
}
conferir("a anotação foi registrada", anotou);

// ---- 3. devolve o pedido ao estado anterior ----
await sql.query(
  "update service_requests set status = $2, close_reason = null, closed_at = null where id = $1",
  [pedido.id, pedido.status],
);
await sql.query(
  "delete from interactions where subject_id = $1 and body like 'Anotação criada pela verificação%'",
  [pedido.id],
);
await sql.query(
  "delete from activities where subject_id = $1 and summary like '%Cancelada%'",
  [pedido.id],
);

ws.close();
edge.kill();
await sql.end();

console.log("");
if (falhas.length === 0) {
  console.log("Todas as ações responderam pelo navegador.");
} else {
  console.log(`${falhas.length} falha(s): ${falhas.join(", ")}`);
  process.exitCode = 1;
}
process.exit(falhas.length === 0 ? 0 : 1);
