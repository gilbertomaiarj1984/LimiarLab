// Testes das regras de domínio com os dados reais da semana de 09/11/2026 (fixtures/).
// Os números esperados foram conferidos à parte com o Garmin (ver docs/analise-intensidade-2026-11.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addDays, easyDayOffTarget, inferKinds, intensitySplit, isIsoDate, localDate, longDate, matchPlan,
  splitPercents, weekDays, weekStart, weekStats, type Physiology,
} from "./domain.ts";
import { importSchema } from "./import-schema.ts";
import { payloadActivities, payloadPlanned } from "./mapping.ts";
import { clock, hm, km, pace } from "./format.ts";

const PHYS: Physiology = { lv1: 141, lv2: 159, hardFrom: 157, easyTarget: 135, longTarget: 138 };
const TZ = "America/Sao_Paulo";
const raw = JSON.parse(readFileSync(new URL("../fixtures/semana-2026-11-09.json", import.meta.url), "utf8"));
const payload = importSchema.parse(raw);
const allActs = payloadActivities(payload, TZ);
const planned = payloadPlanned(payload);
const TODAY = "2026-11-13";
const week = allActs.filter((a) => a.date >= "2026-11-09" && a.date <= "2026-11-15");
const prev = allActs.filter((a) => a.date >= "2026-11-02" && a.date <= "2026-11-08");

test("datas: semana começa na segunda e atravessa mês e ano", () => {
  assert.equal(weekStart("2026-11-13"), "2026-11-09");
  assert.equal(weekStart("2026-11-09"), "2026-11-09");
  assert.equal(weekStart("2026-11-15"), "2026-11-09");
  assert.equal(weekStart("2026-11-01"), "2026-10-26");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
  assert.deepEqual(weekDays("2026-12-28").slice(-2), ["2027-01-02", "2027-01-03"]);
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(longDate("2026-11-13"), "Sexta, 13 de novembro");
});

test("datas: validação de ISO e dia local no fuso do atleta", () => {
  assert.ok(isIsoDate("2026-11-13"));
  assert.ok(!isIsoDate("2026-02-30"));
  assert.ok(!isIsoDate("13/11/2026"));
  // 01:30 UTC de 14/11 ainda é 13/11 em São Paulo.
  assert.equal(localDate(new Date("2026-11-14T01:30:00Z"), TZ), "2026-11-13");
  assert.equal(localDate(new Date("2026-11-14T03:00:00Z"), TZ), "2026-11-14");
});

test("importação: o fixture é válido e as datas saem no fuso certo", () => {
  assert.equal(allActs.length, 13);
  assert.equal(week.length, 6);
  assert.equal(prev.length, 7);
  const late = allActs.find((a) => a.id === "garmin:25060263662")!;
  assert.equal(late.date, "2026-11-12"); // 20:22 em SP = 23:22 UTC, mesmo dia
});

test("importação: recusa dados inválidos", () => {
  const bad = structuredClone(raw);
  bad.activities[0].start_time = "2026-11-09T06:37:31"; // sem fuso
  assert.equal(importSchema.safeParse(bad).success, false);
  const dup = structuredClone(raw);
  dup.planned.push(dup.planned[0]);
  assert.equal(importSchema.safeParse(dup).success, false);
  const fora = structuredClone(raw);
  fora.planned[0].date = "2026-11-20"; // fora do planned_replace
  assert.equal(importSchema.safeParse(fora).success, false);
  const extra = structuredClone(raw);
  extra.activities[0].calorias = 650;
  assert.equal(importSchema.safeParse(extra).success, false);
});

test("intensidade: zonas do Garmin viram 3 faixas pelos limiares", () => {
  const seg = week.find((a) => a.date === "2026-11-09")!;
  const s = intensitySplit(seg.hrZones!, PHYS);
  assert.equal(Math.round(s.easy), 463); // Z1 + Z2
  assert.equal(Math.round(s.moderate), 2229); // Z3 + Z4
  assert.equal(s.hard, 0);
  assert.deepEqual(splitPercents(s), { easy: 17, moderate: 83, hard: 0 });
  // Zona que atravessa o LV1 conta como moderada.
  const z = intensitySplit([{ minBpm: 120, seconds: 60 }, { minBpm: 138, seconds: 60 }, { minBpm: 160, seconds: 60 }], PHYS);
  assert.deepEqual([z.easy, z.moderate, z.hard], [60, 60, 60]);
});

test("percentuais sempre somam 100", () => {
  for (const a of allActs.filter((x) => x.hrZones)) {
    const p = splitPercents(intensitySplit(a.hrZones!, PHYS))!;
    assert.equal(p.easy + p.moderate + p.hard, 100, a.id);
  }
  assert.equal(splitPercents({ easy: 0, moderate: 0, hard: 0, total: 0 }), null);
  assert.deepEqual(splitPercents({ easy: 1, moderate: 1, hard: 1, total: 3 }), { easy: 34, moderate: 33, hard: 33 });
});

test("força: subtipo vem do plano do dia e fica marcado como inferido", () => {
  const acts = inferKinds(week, planned);
  const forca = acts.filter((a) => a.sport === "strength").map((a) => [a.date, a.kind, a.kindInferred]);
  assert.deepEqual(forca, [
    ["2026-11-10", "forca_inferiores", true],
    ["2026-11-11", "forca_superiores", true],
    ["2026-11-12", "forca_inferiores", true],
  ]);
  // Dois treinos de força planejados no mesmo dia: ambíguo, não infere.
  const amb = inferKinds(week, [...planned, { ...planned[3], id: "x", kind: "forca_superiores" }]);
  assert.equal(amb.find((a) => a.date === "2026-11-10" && a.sport === "strength")!.kind, "forca");
});

test("plano x realizado da semana até sexta 13/11", () => {
  const plan = matchPlan(planned, week, TODAY);
  const st = Object.fromEntries(plan.map((p) => [p.id, p.status]));
  assert.equal(st["limiarlab:2026-11-09-sup"], "sem_registro");
  assert.equal(st["garmin:1836423033"], "feito");
  assert.equal(st["limiarlab:2026-11-13-opc"], "opcional");
  assert.equal(st["garmin:1836423041"], "pendente");
  assert.equal(st["limiarlab:2026-11-15-desc"], "descanso");
  assert.equal(plan.filter((p) => p.status === "feito").length, 6);
});

test("estatísticas da semana batem com o Garmin", () => {
  const acts = inferKinds(week, planned);
  const plan = matchPlan(planned, acts, TODAY);
  const s = weekStats(acts, plan, prev, PHYS, TODAY);
  assert.equal(km(s.run.km), "25,2");
  assert.equal(hm(s.run.seconds), "2h27");
  assert.equal(s.run.count, 3);
  assert.equal(s.run.elevGainM, 83);
  assert.equal(km(s.run.longestKm), "8,9");
  assert.deepEqual([s.strength.count, s.strength.lower, s.strength.upper, s.strength.other], [3, 2, 1, 0]);
  assert.equal(hm(s.strength.seconds), "2h18");
  assert.equal(hm(s.totalSeconds), "4h45");
  assert.deepEqual(splitPercents(s.intensity), { easy: 33, moderate: 59, hard: 8 });
  assert.deepEqual(s.plan, { doneDue: 6, due: 7, total: 8 });
  assert.equal(km(s.volume.prevKm), "48,8");
  assert.equal(s.volume.plannedRemainingKm, 18);
  assert.equal(km(s.volume.projectedKm), "43,2");
  assert.equal(Math.round(s.volume.delta! * 100), -11);
  assert.equal(s.volume.warn, false);
});

test("aviso de salto de volume acima de 30%", () => {
  const acts = inferKinds(week, planned);
  const plan = matchPlan(planned, acts, TODAY);
  const pouco = prev.filter((a) => a.date === "2026-11-04"); // 8,4 km
  const s = weekStats(acts, plan, pouco, PHYS, TODAY);
  assert.ok(s.volume.warn);
  const semAnterior = weekStats(acts, plan, [], PHYS, TODAY);
  assert.equal(semAnterior.volume.delta, null);
  assert.equal(semAnterior.volume.warn, false);
});

test("dia leve fora do alvo", () => {
  const seg = week.find((a) => a.date === "2026-11-09")!;
  const ter = week.find((a) => a.date === "2026-11-10" && a.sport === "run")!;
  assert.ok(easyDayOffTarget(seg, PHYS)); // FC 144 num dia leve
  assert.ok(!easyDayOffTarget(ter, PHYS)); // qualidade não entra
});

test("formatação", () => {
  assert.equal(clock(2903.18), "48:23");
  assert.equal(clock(21243.7), "5h54");
  assert.equal(pace(2903.18, 8309.39), "5:49/km");
  assert.equal(hm(3120), "52 min");
  assert.equal(hm(3600), "1h00");
});
