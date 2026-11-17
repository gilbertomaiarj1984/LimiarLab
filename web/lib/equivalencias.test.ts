import { test } from "node:test";
import assert from "node:assert/strict";
import { checkData, swapGroups } from "./equivalencias.ts";

test("trocas: todos os ids existem e todo substituto tem figura", () => {
  assert.deepEqual(checkData(), []);
});

test("trocas: cada exercício dos treinos de força tem substitutos", () => {
  const esperado: Record<string, number> = { "superiores-segunda": 7, "inferiores-terca": 6, "superiores-quarta": 7, "inferiores-quinta": 7 };
  for (const [slug, n] of Object.entries(esperado)) {
    for (let i = 1; i <= n; i++) {
      const g = swapGroups(slug, i);
      assert.ok(g.length >= 1 && g.every((x) => x.alternativas.length >= 3), `${slug}#${i}`);
    }
  }
  // item combinado e item com duas opções do plano
  assert.equal(swapGroups("superiores-quarta", 5).length, 2);
  assert.equal(swapGroups("inferiores-terca", 4).length, 2);
  assert.deepEqual(swapGroups("rodagem-leve", 1), []);
});

test("trocas: quinta não oferece pliometria nem excêntrico pesado", () => {
  for (let i = 1; i <= 7; i++) for (const g of swapGroups("inferiores-quinta", i)) {
    for (const a of g.alternativas) assert.ok(!/pogo|nordic|salto|pular-corda/.test(a.id), a.id);
  }
});
