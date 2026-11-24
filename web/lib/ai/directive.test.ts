import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DIRECTIVE, MAX_DIRECTIVE_CHARS, buildSystem, estimateTokens } from "./directive.ts";

test("o padrão cabe com folga no limite do Groq free (8K tokens/min)", () => {
  assert.ok(DEFAULT_DIRECTIVE.length < MAX_DIRECTIVE_CHARS);
  assert.ok(estimateTokens(DEFAULT_DIRECTIVE) < 1500);
  assert.ok(estimateTokens("x".repeat(MAX_DIRECTIVE_CHARS)) < 2000);
});
test("o padrão traz os pontos-chave de corrida e força, e a palavra JSON (exigida pelo modo JSON do Groq)", () => {
  for (const k of ["LV1 141", "LV2 159", "135", "São Garrafa", "unilaterais", "PSE", "ACWR", "JSON"]) assert.ok(DEFAULT_DIRECTIVE.includes(k), k);
});
test("system final é texto puro: direcionamento, limiares e tarefa, nessa ordem", () => {
  const s = buildSystem("DIR", "\n\nLIM", "faça X");
  assert.ok(s.indexOf("DIR") < s.indexOf("LIM") && s.indexOf("LIM") < s.indexOf("faça X"));
  assert.ok(!/[<>]|```/.test(buildSystem("DIR", "", "t")));
});
