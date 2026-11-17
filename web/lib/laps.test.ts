import test from "node:test";
import assert from "node:assert/strict";
import { intervalSummary, mapStravaLaps, readLaps, type Lap } from "./laps.ts";

const lap = (index: number, distanceM: number, elapsedS: number, avgHr = 140): Lap => ({ index, name: `Volta ${index}`, distanceM, elapsedS, avgHr, maxHr: avgHr + 8, elevM: 1 });

test("8 x 800 m com recuperação, aquecimento e desaquecimento", () => {
  const laps: Lap[] = [lap(1, 1600, 560, 120)];
  for (let i = 0; i < 8; i++) { laps.push(lap(laps.length + 1, 800, 215, 160)); if (i < 7) laps.push(lap(laps.length + 1, 400, 190, 135)); }
  laps.push(lap(laps.length + 1, 1500, 540, 125));
  const r = readLaps(laps);
  assert.equal(r.kind, "intervalado");
  assert.equal(r.work?.count, 8);
  assert.equal(r.rest?.count, 7);
  assert.equal(r.roles[0], "aquecimento");
  assert.equal(r.roles[laps.length - 1], "desaquecimento");
  assert.equal(r.roles[1], "tiro");
  assert.equal(r.roles[2], "recuperacao");
  assert.equal(Math.round(r.work!.paceS!), 269); // 215 s / 0,8 km
  assert.equal(r.work!.avgHr, 160);
});
test("corrida contínua com voltas de 1 km não é intervalado", () => {
  const laps = Array.from({ length: 9 }, (_, i) => lap(i + 1, 1000, 360 + (i % 3) * 4));
  const r = readLaps(laps);
  assert.equal(r.kind, "continuo"); assert.equal(r.work, null);
});
test("poucas voltas ou sem distância: contínuo", () => {
  assert.equal(readLaps([lap(1, 5000, 1800), lap(2, 5000, 1700)]).kind, "continuo");
  assert.equal(readLaps([]).kind, "continuo");
});
test("mapeia voltas do Strava e ignora as sem tempo", () => {
  const m = mapStravaLaps([{ lap_index: 2, distance: 800, elapsed_time: 215, average_heartrate: 160.4, max_heartrate: 171 }, { lap_index: 1, distance: 0, elapsed_time: 0 }, { lap_index: 3, distance: 400, moving_time: 190, average_heartrate: 0 }]);
  assert.equal(m.length, 2); assert.equal(m[0].index, 2); assert.equal(m[0].avgHr, 160); assert.equal(m[1].avgHr, null);
});

test("linha de resumo do card", () => {
  const laps: Lap[] = [lap(1, 1600, 560, 120)];
  for (let i = 0; i < 8; i++) { laps.push(lap(laps.length + 1, 800, 215, 160)); if (i < 7) laps.push(lap(laps.length + 1, 400, 190, 135)); }
  laps.push(lap(laps.length + 1, 1500, 540, 125));
  assert.equal(intervalSummary(laps), "8 × 800 m · 4:29/km · FC 160 · recup. 7 × 400 m");
  assert.equal(intervalSummary(Array.from({ length: 9 }, (_, i) => lap(i + 1, 1000, 360))), null);
  assert.equal(intervalSummary(null), null);
});
