import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PAYLOAD_TOKENS, blocks, buildRunPayload, formatRunData, halves, parseFeedback, type FeedbackInput } from "./feedback.ts";
import { estimateTokens } from "./directive.ts";
import type { Activity, Physiology, Planned } from "../domain.ts";
import type { Lap } from "../laps.ts";

const phys: Physiology = { lv1: 141, lv2: 159, hardFrom: 157, easyTarget: 135, longTarget: 138 } as Physiology;
const act = (o: Partial<Activity> = {}): Activity => ({
  id: "a1", date: "2026-11-24", startTime: "2026-11-24T08:00:00.000Z", sport: "run", kind: "corrida_leve", name: "Corrida", durationS: 2700, distanceM: 7000,
  elevGainM: 40, avgHr: 138, maxHr: 150, hrZones: [{ minBpm: 100, seconds: 1500 }, { minBpm: 141, seconds: 1000 }, { minBpm: 157, seconds: 200 }], source: "garmin", ...o,
});
const plan: Planned = { id: "p1", date: "2026-11-24", sport: "run", kind: "corrida_leve", title: "Rodagem leve", notes: null, targetDurationS: 2400, targetDistanceM: 6000, targetHrMax: 135, optional: false, source: "x", workout: null };
const lap = (i: number, distanceM: number, elapsedS: number, avgHr: number): Lap => ({ index: i, name: `V${i}`, distanceM, elapsedS, avgHr, maxHr: avgHr + 5, elevM: 2 });
const km = (n: number, start = 6): Lap[] => Array.from({ length: n }, (_, i) => lap(i + 1, 1000, 330 + i * 4, start * 20 + 10 + i));
const base = (o: Partial<FeedbackInput> = {}): FeedbackInput => ({ activity: act(), plan, phys, laps: km(7), similar: [], ...o });

test("desvios do plano e zonas saem calculados", () => {
  const t = formatRunData(base());
  assert.match(t, /distância 6 km \(realizado \+17%\)/);
  assert.match(t, /duração 40min00s \(realizado \+13%\)/);
  assert.match(t, /3 bpm ACIMA do teto/);
  assert.match(t, /% leve/);
  assert.match(t, /CONTÍNUO/);
  assert.match(t, /negative split|positive split/);
});
test("sem plano e sem voltas: diz o que falta, sem inventar", () => {
  const t = formatRunData(base({ plan: null, laps: null, activity: act({ hrZones: null, avgHr: null, distanceM: null }) }));
  assert.match(t, /nenhum treino de corrida planejado/);
  assert.match(t, /Voltas: não disponíveis/);
  assert.match(t, /Tempo por zona de FC: não disponível/);
});
test("corrida longa com muitas voltas vira no máximo 8 trechos e cabe no orçamento", () => {
  const input = base({ laps: km(40), activity: act({ distanceM: 40000, durationS: 14000 }), similar: [{ date: "2026-11-17", distanceM: 30000, durationS: 11000, avgHr: 140 }] });
  const t = formatRunData(input);
  assert.ok((t.match(/ km: pace/g) ?? []).length <= 8);
  assert.ok(estimateTokens(t) <= MAX_PAYLOAD_TOKENS, `tokens ${estimateTokens(t)}`);
  assert.match(t, /ÚLTIMAS CORRIDAS PARECIDAS/);
});
test("compacto corta a lista de voltas mas mantém os números derivados", () => {
  const full = formatRunData(base({ laps: km(10) }), false), c = formatRunData(base({ laps: km(10) }), true);
  assert.ok(c.length < full.length);
  assert.match(c, /1ª metade/);
  assert.doesNotMatch(c, /Voltas \(distância/);
});
test("intervalado: tiros, recuperações e aquecimento viram resumo", () => {
  const laps: Lap[] = [lap(1, 1500, 600, 125), ...[0, 1, 2, 3].flatMap((k) => [lap(2 + k * 2, 400, 100, 168), lap(3 + k * 2, 100, 90, 130)]), lap(10, 1200, 500, 120)];
  const t = formatRunData(base({ laps, activity: act({ kind: "qualidade" }) }));
  assert.match(t, /INTERVALADO/);
  assert.match(t, /Tiros: 4 ×/);
  assert.match(t, /Aquecimento/);
});
test("buildRunPayload sempre dentro do orçamento nos casos grandes", () => {
  const p = buildRunPayload(base({ laps: km(60), plan: { ...plan, notes: "x".repeat(300) } }));
  assert.ok(p.tokens <= MAX_PAYLOAD_TOKENS + 50);
});
test("halves e blocks", () => {
  const [a, b] = halves(km(6));
  assert.equal(a.length + b.length, 6);
  assert.ok(blocks(km(40), 8).length <= 8);
});
test("parseFeedback aceita JSON puro, com cercas e com texto em volta", () => {
  const j = { resumo: "Boa corrida", veredito: "parcial", intensidade: "acima_do_alvo", pontos_positivos: ["a", "b", "c", "d"], pontos_atencao: [], proximo_passo: "Descansar", levar_ao_treinador: null };
  for (const raw of [JSON.stringify(j), "```json\n" + JSON.stringify(j) + "\n```", "Aqui está: " + JSON.stringify(j) + " fim"]) {
    const r = parseFeedback(raw)!;
    assert.equal(r.resumo, "Boa corrida"); assert.equal(r.veredito, "parcial"); assert.equal(r.intensidade, "acima_do_alvo");
    assert.equal(r.pontosPositivos.length, 3); assert.equal(r.levarAoTreinador, null);
  }
});
test("parseFeedback: valor fora da lista vira null e lixo vira null", () => {
  assert.equal(parseFeedback(JSON.stringify({ resumo: "x", veredito: "otimo", intensidade: 3 }))!.veredito, null);
  assert.equal(parseFeedback("não é json"), null);
  assert.equal(parseFeedback("{quebrado"), null);
  assert.equal(parseFeedback(JSON.stringify({ veredito: "parcial" })), null);
});
