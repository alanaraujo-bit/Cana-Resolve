import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { conferir, gerarHash, precisaRegravar, validarSenha } from "@/lib/auth/senha";

/**
 * A senha do parceiro.
 *
 * É a única coisa neste repositório em que um erro silencioso deixa entrar quem
 * não devia — um `conferir` que devolvesse `true` por engano não quebraria
 * nenhuma tela, não apareceria em nenhum log e passaria despercebido até o dia
 * ruim. Por isso os casos feios estão todos aqui.
 */

describe("senha do parceiro", () => {
  it("aceita a senha certa e recusa a errada", async () => {
    const hash = await gerarHash("chuveiro-quente-42");
    assert.equal(await conferir("chuveiro-quente-42", hash), true);
    assert.equal(await conferir("chuveiro-quente-43", hash), false);
    assert.equal(await conferir("", hash), false);
  });

  it("guarda no formato documentado, e nunca a senha em si", async () => {
    const hash = await gerarHash("uma-senha-qualquer");
    const partes = hash.split("$");
    assert.equal(partes.length, 6);
    assert.equal(partes[0], "scrypt");
    assert.equal(Number(partes[1]), 16384);
    assert.ok(!hash.includes("uma-senha-qualquer"));
  });

  it("o mesmo texto gera hashes diferentes — o sal é sorteado a cada vez", async () => {
    const a = await gerarHash("mesma-senha");
    const b = await gerarHash("mesma-senha");
    assert.notEqual(a, b);
    assert.equal(await conferir("mesma-senha", a), true);
    assert.equal(await conferir("mesma-senha", b), true);
  });

  it("não confunde acento composto com acento pronto", async () => {
    // "José" digitado no Android e no iPhone pode chegar em normalizações
    // diferentes; para quem digita, é a mesma senha.
    const hash = await gerarHash("josé-eletricista".normalize("NFC"));
    assert.equal(await conferir("josé-eletricista".normalize("NFD"), hash), true);
  });

  it("devolve falso, sem lançar, para hash corrompido ou inventado", async () => {
    for (const ruim of [
      "",
      "não é hash",
      "scrypt$16384$8$1$só-uma-parte",
      "scrypt$16384$8$1$$",
      "bcrypt$16384$8$1$AAAA$AAAA",
      "scrypt$abc$8$1$AAAA$AAAA",
      "$$$$$",
    ]) {
      assert.equal(await conferir("qualquer", ruim), false, `deveria recusar "${ruim}"`);
    }
  });

  it("recusa um hash com custo absurdo em vez de travar o servidor", async () => {
    // Um hash forjado com N gigante seria negação de serviço na rota de login.
    const forjado = "scrypt$1073741824$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAA";
    const antes = Date.now();
    assert.equal(await conferir("qualquer", forjado), false);
    assert.ok(Date.now() - antes < 1000, "não pode gastar tempo com um hash forjado");
  });

  it("sabe quando um hash antigo precisa ser regravado", async () => {
    assert.equal(precisaRegravar(await gerarHash("x-qualquer-coisa")), false);
    assert.equal(precisaRegravar("scrypt$1024$8$1$AAAA$AAAA"), true);
    assert.equal(precisaRegravar("qualquer lixo"), true);
  });

  it("a régua da senha é curta, mas existe", () => {
    assert.equal(validarSenha("chuveiro-quente"), null);
    assert.ok(validarSenha("curta"));
    assert.ok(validarSenha("12345678"), "só números não passa");
    assert.ok(validarSenha("a".repeat(300)), "longa demais não passa");
  });
});
