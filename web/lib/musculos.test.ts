import { test } from "node:test";
import assert from "node:assert/strict";
import { faixa, mapaMuscular, pesos } from "./musculos.ts";
import type { RegistroForca } from "./forca.ts";

const item = (id: string | null, nome: string, feitas: number) => ({
  ex: 1, nome, id, plano: { nome, id }, trocado: false, series_plano: 3, reps: "10", series_feitas: feitas,
  situacao: feitas ? "feito" as const : "nao_feito" as const, motivo: null,
});

test("músculos: principal vale 1, secundário 0,5", () => {
  const p = pesos("agachamento-smith");
  assert.equal(p.quadriceps, 1);
  assert.ok(Object.values(p).every((v) => v === 1 || v === 0.5));
  assert.deepEqual(pesos("nao-existe"), {});
});

test("músculos: soma séries feitas e ignora não feito", () => {
  const reg: RegistroForca = {
    data: "2026-11-17", treino: "inferiores-terca", titulo: "x", obs: null, pse: null, confirmado_em: "",
    itens: [item("agachamento-smith", "Agachamento", 4), item("cadeira-flexora", "Flexora", 0), item(null, "Algo novo", 3)],
  };
  const m = mapaMuscular([reg]);
  assert.equal(m.series.quadriceps, 4);
  assert.equal(m.series.posteriores, 0 + (pesos("agachamento-smith").posteriores ?? 0) * 4);
  assert.deepEqual(m.semMapa, ["Algo novo"]);
  assert.equal(m.exercicios.quadriceps[0].nome, "Agachamento");
});

test("músculos: faixas por semana", () => {
  assert.deepEqual([0, 1, 3, 6, 10, 20].map(faixa), [0, 1, 2, 3, 4, 4]);
});

test("músculos: todos os exercícios dos treinos têm região", async () => {
  const data = (await import("./equivalencias-data.json", { with: { type: "json" } })).default as { slots: { original: string; substitutos: { id: string }[] }[] };
  const ids = new Set(data.slots.flatMap((s) => [s.original, ...s.substitutos.map((x) => x.id)]));
  const sem = [...ids].filter((id) => !Object.keys(pesos(id)).length);
  assert.deepEqual(sem, []);
});

test("músculos: volume por semana e alertas", async () => {
  const { volumeSemanal, alertas } = await import("./musculos.ts");
  const reg = (data: string, n: number): RegistroForca => ({
    data, treino: "t", titulo: "x", obs: null, pse: null, confirmado_em: "", itens: [item("agachamento-smith", "Agachamento", n)],
  });
  const v = volumeSemanal(["2026-11-09", "2026-11-16"], [reg("2026-11-10", 4), reg("2026-11-12", 8), reg("2026-11-18", 3)]);
  assert.equal(v[0].series.quadriceps, 12);
  assert.equal(v[1].series.quadriceps, 3);
  const a = alertas(v[1].series);
  assert.ok(a.some((x) => x.regiao === "quadriceps" && x.tipo === "pouco"));
  assert.ok(!a.some((x) => x.regiao === "peito"));
  const muito = { ...v[0].series, peito: 25 };
  assert.ok(alertas(muito).some((x) => x.regiao === "peito" && x.tipo === "excesso"));
});
