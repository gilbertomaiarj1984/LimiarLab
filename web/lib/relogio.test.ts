import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWatchPlan, confirmacaoDoRelogio, limpa, midRest, repsText, watchLabel } from "./relogio.ts";
import type { Planned } from "./domain.ts";
import type { Workout } from "./import-schema.ts";

const treino: Workout = {
  slug: "superiores-segunda",
  title: "Superiores A: costas e peito (segunda)",
  rest: "60–90 s",
  exercises: [
    { name: "Puxada frontal (pulldown)", sets: 3, reps: "8–12", load: "65–75% 1RM", focus: "Costas", tips: ["Dica 1"], figure: "puxada", rest_s: 90 },
    { name: "Remada baixa", sets: 3, reps: "10 por lado", figure: "remada-baixa" },
  ],
};

function plano(date: string, extra: Partial<Planned> = {}): Planned {
  return {
    id: date, date, sport: "strength", kind: "forca_superiores", title: "x", notes: null, targetDurationS: null,
    targetDistanceM: null, targetHrMax: null, optional: false, source: "limiarlab", workout: "superiores-segunda", ...extra,
  } as Planned;
}

test("relógio: textos e descanso", () => {
  assert.equal(midRest("60–90 s"), 75);
  assert.equal(midRest(null), 75);
  assert.equal(repsText("8–12"), "8-12 reps");
  assert.equal(repsText("10 por lado"), "10 por lado");
  assert.equal(limpa("“a” – b ≈ c…"), '"a" - b ~ c...');
  assert.equal(watchLabel("2026-11-18", "2026-11-18"), "Hoje");
  assert.equal(watchLabel("2026-11-19", "2026-11-18"), "Amanhã");
  assert.equal(watchLabel("2026-11-21", "2026-11-18"), "sáb 21/11");
});

test("relógio: só força com treino, de hoje até 6 dias depois, na data remarcada", () => {
  const ws = new Map([["superiores-segunda", treino]]);
  const p = buildWatchPlan("2026-11-18", [
    plano("2026-11-17"),
    plano("2026-11-18"),
    plano("2026-11-18", { sport: "run", workout: null }),
    plano("2026-11-20", { workout: "nao-existe" }),
    plano("2026-11-24"),
    plano("2026-11-25"),
  ], ws, []);
  assert.deepEqual(p.sessoes.map((s) => s.data), ["2026-11-18", "2026-11-24"]);
  const s = p.sessoes[0];
  assert.equal(s.nome, "Superiores A: costas e peito");
  assert.equal(s.rotulo, "Hoje");
  assert.deepEqual(s.ex[0], { n: "Puxada frontal (pulldown)", s: 3, r: "8-12 reps", c: "65-75% 1RM", d: 90, f: "Costas", t: ["Dica 1"], g: "puxada", o: "" });
  assert.equal(s.ex[1].d, 75); // sem rest_s: usa o descanso do treino
});

test("relógio: troca do dia substitui nome, séries, reps, dicas e figura; não vale em outro dia", () => {
  const ws = new Map([["superiores-segunda", treino]]);
  const swaps = [{ date: "2026-11-18", slug: "superiores-segunda", ex: 1, g: 0, id: "puxada-unilateral-cabo" }];
  const p = buildWatchPlan("2026-11-18", [plano("2026-11-18"), plano("2026-11-23")], ws, swaps);
  const e = p.sessoes[0].ex[0];
  assert.notEqual(e.n, "Puxada frontal (pulldown)");
  assert.equal(e.o, "Puxada frontal (pulldown)");
  assert.equal(e.r, "8-12 por lado");
  assert.equal(e.c, "");
  assert.equal(e.d, 90);
  assert.ok(e.g.length > 0 && e.t.length > 0);
  assert.equal(p.sessoes[1].ex[0].n, "Puxada frontal (pulldown)");
  // troca inexistente na base: fica o original
  const q = buildWatchPlan("2026-11-18", [plano("2026-11-18")], ws, [{ ...swaps[0], id: "nao-existe" }]);
  assert.equal(q.sessoes[0].ex[0].n, "Puxada frontal (pulldown)");
});

test("relógio: confirmação do treino a partir das séries feitas", () => {
  const sw = [{ ex: 2, g: 0, id: "x" }];
  assert.deepEqual(confirmacaoDoRelogio(2, [3, 1], sw), [
    { ex: 1, series: 3, troca: null },
    { ex: 2, series: 1, troca: { g: 0, id: "x" } },
  ]);
  assert.equal(confirmacaoDoRelogio(2, [3], []), null);
  assert.equal(confirmacaoDoRelogio(2, [3, 11], []), null);
  assert.equal(confirmacaoDoRelogio(2, [3, -1], []), null);
  assert.equal(confirmacaoDoRelogio(2, [3, 1.5], []), null);
  assert.equal(confirmacaoDoRelogio(1, "3", []), null);
});
