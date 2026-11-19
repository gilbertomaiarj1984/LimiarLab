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

test("recuperação parada (dados reais do Garmin): 8 × 800 m, recup. 7 × 1:25 parado", () => {
  const rest = (i: number, d: number, hr: number, s = 85) => lap(i, d, s, hr);
  const laps: Lap[] = [lap(1, 1000, 420, 110), lap(2, 1000, 298, 125)];
  const dists = [29, 35, 48, 40, 33, 38, 45];
  for (let i = 0; i < 8; i++) {
    laps.push(lap(laps.length + 1, 800, 216 + i, 137 + i * 2));
    if (i < 7) laps.push(rest(laps.length + 1, dists[i], 120 + i * 3));
    else laps.push(rest(laps.length + 1, 30, 140, 62));
  }
  laps.push(lap(laps.length + 1, 395, 150, 125));
  const r = readLaps(laps);
  assert.equal(r.kind, "intervalado");
  assert.equal(r.work?.count, 8);
  assert.equal(r.rest?.count, 7);
  assert.equal(r.rest?.stationary, true);
  assert.equal(r.roles[0], "aquecimento");
  assert.equal(r.roles[laps.length - 2], "recuperacao");
  assert.equal(r.roles[laps.length - 1], "desaquecimento");
  const s = intervalSummary(laps)!;
  assert.match(s, /^8 × 800 m · 4:\d\d\/km · FC 14\d · recup\. 7 × 1:25 parado$/);
});

test("rua, areia fofa e rua (dados reais, 19/11/2026): voltas automáticas de 1 km não viram intervalado", () => {
  // Garmin, 20' Z2 na rua + 20' na areia fofa + 20' Z2 na rua; voltas a cada 1 km e na troca de etapa do treino.
  const laps: Lap[] = [
    lap(1, 1000, 333, 116), lap(2, 1000, 321, 131), lap(3, 1000, 320, 139), lap(4, 678.66, 225, 139),
    lap(5, 1000, 383, 143), lap(6, 1000, 398, 145), lap(7, 965.54, 457, 144),
    lap(8, 1000, 351, 142), lap(9, 1000, 352, 144), lap(10, 1000, 334, 147), lap(11, 251.52, 93, 148),
  ];
  laps[6].movingS = 416;
  assert.equal(readLaps(laps).kind, "continuo");
  assert.equal(intervalSummary(laps), null);
});

test("6 × 1 km com 1 km trotando entre os tiros, tudo em voltas de 1 km: continua intervalado", () => {
  const laps: Lap[] = [lap(1, 1000, 360, 125), lap(2, 1000, 355, 130)];
  for (let i = 0; i < 6; i++) { laps.push(lap(laps.length + 1, 1000, 250, 160)); if (i < 5) laps.push(lap(laps.length + 1, 1000, 390, 140)); }
  laps.push(lap(laps.length + 1, 1000, 370, 130), lap(laps.length + 2, 300, 110, 125));
  const r = readLaps(laps);
  assert.equal(r.kind, "intervalado");
  assert.equal(r.work?.count, 6);
  assert.equal(r.rest?.count, 5);
});
