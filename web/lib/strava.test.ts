import test from "node:test";
import assert from "node:assert/strict";
import { activitySchema } from "./import-schema.ts";
import { garminIdOf, mapStravaActivity, sameInstant, authorizeUrl } from "./strava.ts";

const base = { id: 111, name: "Corrida matinal", sport_type: "Run", start_date: "2026-11-17T09:12:00Z", elapsed_time: 3300, distance: 8870.4, total_elevation_gain: 52.3, average_heartrate: 136.4, max_heartrate: 151 };

test("corrida vira atividade válida no contrato", () => {
  const m = mapStravaActivity(base)!;
  assert.equal(m.sport, "run"); assert.equal(m.kind, "corrida"); assert.equal(m.source, "strava"); assert.equal(m.external_id, "111");
  assert.equal(m.avg_hr, 136); assert.equal(m.max_hr, 151);
  assert.ok(activitySchema.safeParse(m).success);
});
test("id do Garmin em external_id reaproveita a linha do Garmin", () => {
  assert.equal(garminIdOf("garmin_push_25106117927"), "25106117927");
  assert.equal(garminIdOf("abc"), null);
  const m = mapStravaActivity({ ...base, external_id: "garmin_push_25106117927" })!;
  assert.equal(m.source, "garmin"); assert.equal(m.external_id, "25106117927");
});
test("longo a partir de 15 km, prova só se marcada no Strava", () => {
  assert.equal(mapStravaActivity({ ...base, distance: 15000 })!.kind, "longo");
  assert.equal(mapStravaActivity({ ...base, distance: 42000, workout_type: 1 })!.kind, "prova");
  assert.equal(mapStravaActivity({ ...base, distance: 42000 })!.kind, "longo");
});
test("musculação: força sem distância; outros viram outro", () => {
  const w = mapStravaActivity({ ...base, sport_type: "WeightTraining", distance: 0, total_elevation_gain: 0 })!;
  assert.equal(w.sport, "strength"); assert.equal(w.kind, "forca"); assert.equal(w.distance_m, null); assert.equal(w.elevation_gain_m, null);
  assert.ok(activitySchema.safeParse(w).success);
  const o = mapStravaActivity({ ...base, sport_type: "Ride" })!;
  assert.equal(o.sport, "other"); assert.equal(o.kind, "outro");
  assert.ok(activitySchema.safeParse(o).success);
});
test("sem duração ou FC fora da faixa: ignora ou zera", () => {
  assert.equal(mapStravaActivity({ ...base, elapsed_time: 0 }), null);
  assert.equal(mapStravaActivity({ ...base, average_heartrate: 0 })!.avg_hr, null);
});
test("mesma atividade de fontes diferentes por proximidade", () => {
  assert.ok(sameInstant("2026-11-17T09:12:00Z", "2026-11-17T09:15:00Z"));
  assert.ok(!sameInstant("2026-11-17T09:12:00Z", "2026-11-17T10:12:00Z"));
});
test("url de autorização pede só leitura", () => {
  const u = new URL(authorizeUrl("1", "https://x/cb", "s"));
  assert.equal(u.searchParams.get("scope"), "activity:read_all"); assert.equal(u.searchParams.get("state"), "s");
});

import { importSchema } from "./import-schema.ts";
test("lote só de zonas é aceito; zona sem fuso ou vazia é recusada", () => {
  const ok = importSchema.safeParse({ athlete: "giba", zones: [{ start_time: "2026-11-12T06:27:11-03:00", hr_zones: [{ min_bpm: 102, seconds: 60 }] }] });
  assert.ok(ok.success);
  assert.ok(!importSchema.safeParse({ athlete: "giba", zones: [{ start_time: "2026-11-12T06:27:11", hr_zones: [{ min_bpm: 102, seconds: 60 }] }] }).success);
  assert.ok(!importSchema.safeParse({ athlete: "giba", zones: [{ start_time: "2026-11-12T06:27:11Z", hr_zones: [] }] }).success);
});
