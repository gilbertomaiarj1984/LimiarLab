import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importSchema } from "./import-schema.ts";
import { payloadRaces } from "./mapping.ts";
import { countdown, goalPace, notesForDay, raceNotes, recoveryDays, type Race } from "./races.ts";
import { weekdayIndex } from "./domain.ts";

const raw = JSON.parse(readFileSync(new URL("../fixtures/metas-2026-11-15.json", import.meta.url), "utf8"));
const races = payloadRaces(importSchema.parse(raw));
const r15 = races[0];

test("prova de 15 km em 13/12: domingo, prioridade B, 28 dias a partir de 15/11", () => {
  assert.equal(r15.date, "2026-12-13");
  assert.equal(weekdayIndex(r15.date), 6);
  assert.equal(r15.priority, "B");
  assert.equal(countdown("2026-11-15", r15.date), "em 28 dias (4 semanas)");
  assert.equal(countdown("2026-12-12", r15.date), "amanhã");
  assert.equal(countdown("2026-12-03", r15.date), "em 10 dias (1 semana e 3 dias)");
});

test("prova B: semana mais leve, pernas fora nos 3 últimos dias, véspera sem longão, 3 dias de recuperação", () => {
  const n = raceNotes(r15);
  const at = (d: string) => n.filter((x) => x.date === d).map((x) => x.kind);
  assert.deepEqual(at("2026-12-07"), ["semana"]);         // segunda da semana da prova
  assert.deepEqual(at("2026-12-10").sort(), ["intensidade", "pernas"]);
  assert.deepEqual(at("2026-12-12"), ["vespera"]);        // sábado: no lugar do longão
  assert.deepEqual(at("2026-12-13"), ["prova"]);
  assert.deepEqual(at("2026-12-14"), ["recuperacao"]);
  assert.equal(recoveryDays(r15), 3);
  assert.match(n.find((x) => x.kind === "recuperacao")!.text, /qua 16\/12/);
  assert.match(n.find((x) => x.kind === "vespera")!.text, /Sem longão/);
  assert.equal(notesForDay("2026-12-11", races).length, 0);
  assert.equal(notesForDay("2026-12-06", races).length, 0); // domingo anterior: semana normal
});

test("prova A: polimento de 2 semanas; C: só véspera e dia seguinte", () => {
  const a: Race = { ...r15, id: "x:a", date: "2027-05-30", distanceM: 42195, priority: "A" };
  const na = raceNotes(a);
  assert.equal(na[0].date, "2027-05-16");
  assert.equal(na[0].kind, "polimento");
  assert.match(na[0].text, /40–60%/);
  assert.equal(recoveryDays(a), 7);
  const c: Race = { ...r15, id: "x:c", priority: "C" };
  assert.deepEqual(raceNotes(c).map((x) => x.kind), ["vespera", "prova", "recuperacao"]);
  assert.equal(recoveryDays({ distanceM: 80000, priority: "A" }), 14);
});

test("ritmo do tempo-alvo e validação do lote", () => {
  assert.equal(goalPace({ goalTimeS: 4500, distanceM: 15000 }), "5:00/km");
  assert.equal(goalPace({ goalTimeS: null, distanceM: 15000 }), null);
  const bad = structuredClone(raw);
  bad.races[0].priority = "D";
  assert.equal(importSchema.safeParse(bad).success, false);
  const out = structuredClone(raw);
  out.races[0].date = "2026-11-01"; // fora do races_replace
  assert.equal(importSchema.safeParse(out).success, false);
});
