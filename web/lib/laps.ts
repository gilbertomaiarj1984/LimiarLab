// Voltas (laps) de uma corrida e leitura de treino intervalado. Funções puras, testadas em laps.test.ts.

export type Lap = {
  index: number;
  name: string;
  distanceM: number;
  elapsedS: number;
  /** Tempo em movimento (sem a pausa automática do relógio). */
  movingS?: number;
  avgHr: number | null;
  maxHr: number | null;
  elevM: number | null;
};

/** Campos do lap do Strava (GET /activities/{id}/laps) que usamos. */
export type StravaLap = {
  lap_index?: number; name?: string; distance?: number; elapsed_time?: number; moving_time?: number;
  average_heartrate?: number; max_heartrate?: number; total_elevation_gain?: number;
};

const hr = (n: number | undefined) => (n != null && Number.isFinite(n) && n >= 30 && n <= 250 ? Math.round(n) : null);

export function mapStravaLaps(laps: StravaLap[]): Lap[] {
  return laps
    .map((l, i) => ({
      index: l.lap_index ?? i + 1,
      name: l.name ?? `Volta ${i + 1}`,
      distanceM: Math.max(0, l.distance ?? 0),
      elapsedS: Math.max(0, l.elapsed_time ?? l.moving_time ?? 0),
      movingS: l.moving_time != null ? Math.max(0, l.moving_time) : undefined,
      avgHr: hr(l.average_heartrate),
      maxHr: hr(l.max_heartrate),
      elevM: l.total_elevation_gain != null ? Math.round(l.total_elevation_gain) : null,
    }))
    .filter((l) => l.elapsedS > 0)
    .sort((a, b) => a.index - b.index);
}

export type LapRole = "aquecimento" | "tiro" | "recuperacao" | "desaquecimento" | "volta";
export type LapGroup = {
  count: number; avgDistanceM: number; avgElapsedS: number; paceS: number | null; avgHr: number | null; maxHr: number | null;
  bestPaceS: number | null; worstPaceS: number | null;
  /** Recuperação parada ou quase (velocidade média abaixo de 1 m/s): mede-se por tempo, não por distância. */
  stationary: boolean;
};
export type LapsReading = {
  kind: "intervalado" | "continuo";
  roles: LapRole[];
  work: LapGroup | null;
  rest: LapGroup | null;
};

/** Abaixo disto (m/s, distância ÷ tempo total da volta) a volta é parada/andando: uma recuperação, não um trecho de corrida. */
const STATIONARY_MPS = 1.0;
const MIN_REST_S = 15;
export const isStationary = (l: Pick<Lap, "distanceM" | "elapsedS">): boolean => l.elapsedS >= MIN_REST_S && l.distanceM / l.elapsedS < STATIONARY_MPS;

/** Tempo para o pace: em volta correndo, o tempo em movimento (pausa do relógio não conta); volta parada não tem pace. */
const paceTime = (l: Lap): number => (l.movingS && l.movingS > 0 && l.movingS <= l.elapsedS ? l.movingS : l.elapsedS);

/** Segundos por km (null sem distância ou em volta parada). */
export const paceSecPerKm = (l: Lap): number | null => (l.distanceM > 0 && !isStationary(l) ? paceTime(l) / (l.distanceM / 1000) : null);

function group(ls: Lap[]): LapGroup | null {
  if (!ls.length) return null;
  const dist = ls.reduce((s, l) => s + l.distanceM, 0);
  const elapsed = ls.reduce((s, l) => s + l.elapsedS, 0);
  const hrs = ls.map((l) => l.avgHr).filter((x): x is number => x != null);
  const maxs = ls.map((l) => l.maxHr).filter((x): x is number => x != null);
  const paces = ls.map(paceSecPerKm).filter((x): x is number => x != null);
  const moving = ls.reduce((s, l) => s + paceTime(l), 0);
  return {
    count: ls.length,
    avgDistanceM: dist / ls.length,
    avgElapsedS: elapsed / ls.length,
    paceS: dist > 0 && !ls.every(isStationary) ? moving / (dist / 1000) : null,
    avgHr: hrs.length ? Math.round(hrs.reduce((s, x) => s + x, 0) / hrs.length) : null,
    maxHr: maxs.length ? Math.max(...maxs) : null,
    bestPaceS: paces.length ? Math.min(...paces) : null,
    worstPaceS: paces.length ? Math.max(...paces) : null,
    stationary: dist / elapsed < STATIONARY_MPS,
  };
}

/**
 * Lê as voltas. Intervalado = pelo menos 2 tiros (voltas em ritmo rápido) com recuperação no meio.
 * Recuperação pode ser trotando (voltas mais lentas que os tiros) ou PARADA (voltas com velocidade média
 * abaixo de 1 m/s, medidas por tempo). Os tiros são as voltas em movimento acima do ponto médio entre os
 * dois ritmos (k-means); quando os ritmos não se separam, valem as voltas coladas a uma recuperação parada.
 * Antes do primeiro tiro é aquecimento; depois do último, desaquecimento (a recuperação logo após o último
 * tiro conta como recuperação na tabela, mas fica fora do resumo).
 */
export function readLaps(laps: Lap[]): LapsReading {
  const flat: LapsReading = { kind: "continuo", roles: laps.map(() => "volta"), work: null, rest: null };
  const moving = laps.filter((l) => l.distanceM > 0 && l.elapsedS > 0 && !isStationary(l));
  if (moving.length < 3) return flat;
  const v = (l: Lap) => l.distanceM / paceTime(l);
  const speeds = moving.map(v);
  let lo = Math.min(...speeds), hi = Math.max(...speeds);
  for (let it = 0; it < 20; it++) {
    const fast = speeds.filter((s) => Math.abs(s - hi) <= Math.abs(s - lo));
    const slow = speeds.filter((s) => Math.abs(s - hi) > Math.abs(s - lo));
    if (!fast.length || !slow.length) break;
    const nh = fast.reduce((a, b) => a + b, 0) / fast.length, nl = slow.reduce((a, b) => a + b, 0) / slow.length;
    if (nh === hi && nl === lo) break;
    hi = nh; lo = nl;
  }
  const separated = hi / lo >= 1.15;
  const cut = (hi + lo) / 2;
  const adjacentRest = (i: number) => (i > 0 && isStationary(laps[i - 1])) || (i < laps.length - 1 && isStationary(laps[i + 1]));
  const isMoving = (l: Lap) => l.distanceM > 0 && l.elapsedS > 0 && !isStationary(l);
  const hasRests = laps.filter(isStationary).length >= 2;
  const isWork = (l: Lap, i: number) => isMoving(l) && (separated ? v(l) > cut : adjacentRest(i)) && (!hasRests || adjacentRest(i));
  const workIdx = laps.map((l, i) => (isWork(l, i) ? i : -1)).filter((i) => i >= 0);
  if (workIdx.length < 2) return flat;
  const first = workIdx[0], last = workIdx[workIdx.length - 1];
  const between = laps.slice(first + 1, last).some((l, k) => !isWork(l, first + 1 + k));
  if (!between) return flat;
  const roles: LapRole[] = laps.map((l, i) => {
    if (isWork(l, i)) return "tiro";
    if (i < first) return "aquecimento";
    if (i < last) return "recuperacao";
    return i === last + 1 && isStationary(l) ? "recuperacao" : "desaquecimento";
  });
  return {
    kind: "intervalado",
    roles,
    work: group(laps.filter((l, i) => isWork(l, i))),
    rest: group(laps.filter((_, i) => i > first && i < last && roles[i] === "recuperacao")),
  };
}

const fmtPace = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km` : `${Math.round(m / 10) * 10} m`);

const mmss = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

/** Uma linha para o card: "8 × 800 m · 4:33/km · FC 142 · recup. 7 × 1:25 parado". null quando não é intervalado. */
export function intervalSummary(laps: Lap[] | null | undefined): string | null {
  if (!laps?.length) return null;
  const r = readLaps(laps);
  if (r.kind !== "intervalado" || !r.work) return null;
  const parts = [`${r.work.count} × ${fmtDist(r.work.avgDistanceM)}`];
  if (r.work.paceS != null) parts.push(`${fmtPace(r.work.paceS)}/km`);
  if (r.work.avgHr != null) parts.push(`FC ${r.work.avgHr}`);
  if (r.rest) parts.push(r.rest.stationary ? `recup. ${r.rest.count} × ${mmss(r.rest.avgElapsedS)} parado` : `recup. ${r.rest.count} × ${fmtDist(r.rest.avgDistanceM)}`);
  return parts.join(" · ");
}
