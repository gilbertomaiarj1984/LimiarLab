import test from "node:test";
import assert from "node:assert/strict";
import { formatEstado } from "./estado.ts";
import type { Activity, Physiology, Planned } from "../domain.ts";
import type { Race } from "../races.ts";

const phys: Physiology = { lv1: 141, lv2: 159, hardFrom: 157, easyTarget: 135, longTarget: 138 };
const act = (o: Partial<Activity>): Activity => ({ id: "a", date: "2026-11-17", startTime: "2026-11-17T09:00:00Z", sport: "run", kind: "corrida_leve", name: "n", durationS: 3000, distanceM: 8000, elevGainM: 10, avgHr: 144, maxHr: 150, hrZones: [{ minBpm: 100, seconds: 1000 }, { minBpm: 141, seconds: 2000 }], source: "strava", ...o });
const race: Race = { id: "r", date: "2026-12-13", name: "São Garrafa Run", distanceM: 15000, elevGainM: null, priority: "B", goalTimeS: null, notes: null, source: "x" };
const plan: Planned = { id: "p", date: "2026-11-25", sport: "run", kind: "qualidade", title: "Intervalado", notes: null, targetDurationS: 3000, targetDistanceM: null, targetHrMax: null, optional: false, source: "x", workout: null };

test("estado traz provas, corrida da semana, dia leve acima do LV1 e plano", () => {
  const t = formatEstado({ today: "2026-11-24", phys, activities: [act({}), act({ id: "b", date: "2026-11-22", startTime: "2026-11-22T09:00:00Z", kind: "longo", distanceM: 15000, avgHr: 135 })], planned: [plan], races: [race], strengthLogs: [], goal: "Longos e ultra", physHistory: [{ validFrom: "2026-07-23", lv1: 141, lv2: 159, hrMax: 165, vo2max: 47.1, source: "Teste cardiopulmonar" }] });
  assert.match(t, /São Garrafa Run 15 km \(No caminho/);
  assert.match(t, /Ainda não há prova-alvo/);
  assert.match(t, /leves\/longos acima do LV1: 1 de 2/);
  assert.match(t, /Plano dos próximos 7 dias: qua 25\/11 Intervalado/);
  assert.match(t, /FC média dos leves 140/);
  assert.match(t, /0 confirmada/);
  assert.match(t, /Objetivo: Longos/);
  assert.match(t, /Limiares ao longo do tempo: 23\/07\/2026 LV1 141/);
});
test("sem dados não quebra", () => {
  const t = formatEstado({ today: "2026-11-24", phys, activities: [], planned: [], races: [], strengthLogs: [] });
  assert.match(t, /nenhuma cadastrada/);
  assert.match(t, /sem corridas registradas/);
});
