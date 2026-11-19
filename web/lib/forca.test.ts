import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfirmacaoInvalida, montarItens, resumo, situacao, type RegistroForca } from "./forca.ts";
import type { Workout } from "./import-schema.ts";

const treino: Workout = {
  slug: "inferiores-terca",
  title: "Inferiores pesado (terça)",
  exercises: [
    { name: "Saltitos (pogo)", sets: 3, reps: "20" },
    { name: "Agachamento no smith", sets: 4, reps: "5–6" },
  ],
};

test("força: situação pelas séries feitas", () => {
  assert.equal(situacao(0, 3), "nao_feito");
  assert.equal(situacao(2, 3), "parcial");
  assert.equal(situacao(3, 3), "feito");
  assert.equal(situacao(4, 3), "feito");
});

test("força: troca fica registrada com o original do plano", () => {
  const itens = montarItens("inferiores-terca", treino, [
    { ex: 1, series: 3, troca: { g: 0, id: "panturrilha-explosiva-leg-press" } },
    { ex: 2, series: 2, troca: null },
  ]);
  assert.equal(itens[0].trocado, true);
  assert.equal(itens[0].id, "panturrilha-explosiva-leg-press");
  assert.equal(itens[0].plano.id, "pogo");
  assert.equal(itens[0].plano.nome, "Saltitos (pogo)");
  assert.equal(itens[0].situacao, "feito");
  assert.equal(itens[1].trocado, false);
  assert.equal(itens[1].id, "agachamento-smith");
  assert.equal(itens[1].series_plano, 4);
  assert.equal(itens[1].situacao, "parcial");
});

test("força: recusa confirmação incompleta ou fora da base", () => {
  assert.throws(() => montarItens("inferiores-terca", treino, [{ ex: 1, series: 3, troca: null }]), ConfirmacaoInvalida);
  assert.throws(() => montarItens("inferiores-terca", treino, [
    { ex: 1, series: 3, troca: { g: 0, id: "supino" } }, { ex: 2, series: 4, troca: null },
  ]), ConfirmacaoInvalida);
  assert.throws(() => montarItens("inferiores-terca", treino, [
    { ex: 1, series: 11, troca: null }, { ex: 2, series: 4, troca: null },
  ]), ConfirmacaoInvalida);
  assert.throws(() => montarItens("inferiores-terca", treino, [
    { ex: 1, series: 3, troca: null }, { ex: 1, series: 3, troca: null }, { ex: 2, series: 4, troca: null },
  ]), ConfirmacaoInvalida);
});

test("força: resumo conta feitos, trocas e não feitos", () => {
  const reg = (data: string, troca: boolean): RegistroForca => ({
    data, treino: "inferiores-terca", titulo: "x", obs: null, pse: null, confirmado_em: data,
    itens: montarItens("inferiores-terca", treino, [
      { ex: 1, series: 3, troca: troca ? { g: 0, id: "panturrilha-explosiva-leg-press" } : null },
      { ex: 2, series: 0, troca: null },
    ]),
  });
  const r = resumo([reg("2026-11-10", false), reg("2026-11-17", true)]);
  const pogo = r.find((x) => x.id === "pogo")!;
  assert.deepEqual([pogo.vezes, pogo.trocado_por_outro, pogo.ultima], [1, 1, "2026-11-10"]);
  const pe = r.find((x) => x.id === "panturrilha-explosiva-leg-press")!;
  assert.deepEqual([pe.vezes, pe.como_troca, pe.series], [1, 1, 3]);
  const ag = r.find((x) => x.id === "agachamento-smith")!;
  assert.deepEqual([ag.vezes, ag.nao_feito], [0, 2]);
});

test("força: motivo só vale para troca ou incompleto", () => {
  const itens = montarItens("inferiores-terca", treino, [
    { ex: 1, series: 3, troca: { g: 0, id: "panturrilha-explosiva-leg-press" }, motivo: "ocupado" },
    { ex: 2, series: 4, troca: null, motivo: "cansaco" },
  ]);
  assert.equal(itens[0].motivo, "ocupado");
  assert.equal(itens[1].motivo, null);
  assert.throws(() => montarItens("inferiores-terca", treino, [
    { ex: 1, series: 3, troca: null, motivo: "xyz" as never }, { ex: 2, series: 4, troca: null },
  ]), ConfirmacaoInvalida);
});

test("força: aderência conta feitos, confirmados, trocas e motivos", async () => {
  const { aderencia } = await import("./forca.ts");
  const reg: RegistroForca = {
    data: "2026-11-18", treino: "inferiores-terca", titulo: "x", obs: null, pse: null, confirmado_em: "",
    itens: montarItens("inferiores-terca", treino, [
      { ex: 1, series: 3, troca: { g: 0, id: "panturrilha-explosiva-leg-press" }, motivo: "ocupado" },
      { ex: 2, series: 2, troca: null, motivo: "tempo" },
    ]),
  };
  const a = aderencia([
    { data: "2026-11-16", treino: "superiores-segunda", titulo: "A", realizado: true },
    { data: "2026-11-18", treino: "inferiores-terca", titulo: "B", realizado: true },
    { data: "2026-11-19", treino: "superiores-quarta", titulo: "C", realizado: false },
  ], [reg]);
  assert.deepEqual([a.previstos, a.feitos, a.confirmados], [3, 2, 1]);
  assert.deepEqual(a.series, { plano: 7, feitas: 5 });
  assert.equal(a.trocas[0].vezes, 1);
  assert.equal(a.trocas[0].motivos.ocupado, 1);
  assert.equal(a.incompletos[0].motivos.tempo, 1);
  assert.deepEqual(a.pendentes.map((p) => p.treino), ["superiores-segunda"]);
});
