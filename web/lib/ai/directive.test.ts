import test from "node:test";
import assert from "node:assert/strict";
import { MAX_DIRECTIVE_CHARS, buildSystem, defaultDirectiveFor, estimateTokens } from "./directive.ts";

const giba = defaultDirectiveFor({ slug: "giba", name: "Giba" });
const outro = defaultDirectiveFor({ slug: "maria", name: "Maria" });

test("os dois textos cabem com folga no limite do Groq free (8K tokens/min)", () => {
  for (const t of [giba, outro]) {
    assert.ok(t.length < MAX_DIRECTIVE_CHARS);
    assert.ok(estimateTokens(t) < 1500);
  }
  assert.ok(estimateTokens("x".repeat(MAX_DIRECTIVE_CHARS)) < 2000);
});
test("o contexto do Giba traz os pontos-chave de corrida e força, e a palavra JSON (exigida pelo modo JSON do Groq)", () => {
  for (const k of ["LV1 141", "LV2 159", "135", "São Garrafa", "unilaterais", "PSE", "ACWR", "JSON"]) assert.ok(giba.includes(k), k);
});
test("atleta novo recebe o modelo genérico com o nome dele e nada do Giba", () => {
  assert.match(outro, /ajudando Maria/);
  assert.match(outro, /SOBRE O ATLETA/);
  for (const k of ["Giba", "Niterói", "São Garrafa", "Treinus", "LV1 141"]) assert.ok(!outro.includes(k), k);
  assert.ok(outro.includes("JSON"));
});
test("system final é texto puro: direcionamento, limiares e tarefa, nessa ordem", () => {
  const s = buildSystem("DIR", "\n\nLIM", "faça X");
  assert.ok(s.indexOf("DIR") < s.indexOf("LIM") && s.indexOf("LIM") < s.indexOf("faça X"));
  assert.ok(!/[<>]|```/.test(buildSystem("DIR", "", "t")));
});
