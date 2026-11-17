// Voltas (laps) de uma corrida e leitura de treino intervalado. Funções puras, testadas em laps.test.ts.

export type Lap = {
  index: number;
  name: string;
  distanceM: number;
  elapsedS: number;
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
      avgHr: hr(l.average_heartrate),
      maxHr: hr(l.max_heartrate),
      elevM: l.total_elevation_gain != null ? Math.round(l.total_elevation_gain) : null,
    }))
    .filter((l) => l.elapsedS > 0)
    .sort((a, b) => a.index - b.index);
}

export type LapRole = "aquecimento" | "tiro" | "recuperacao" | "desaquecimento" | "volta";
export type LapGroup = { count: number; avgDistanceM: number; avgElapsedS: number; paceS: number | null; avgHr: number | null; maxHr: number | null; bestPaceS: number | null; worstPaceS: number | null };
export type LapsReading = {
  kind: "intervalado" | "continuo";
  roles: LapRole[];
  work: LapGroup | null;
  rest: LapGroup | null;
};

/** Segundos por km (null sem distância). */
export const paceSecPerKm = (l: { distanceM: number; elapsedS: number }): number | null => (l.distanceM > 0 ? l.elapsedS / (l.distanceM / 1000) : null);

function group(ls: Lap[]): LapGroup | null {
  if (!ls.length) return null;
  const dist = ls.reduce((s, l) => s + l.distanceM, 0);
  const time = ls.reduce((s, l) => s + l.elapsedS, 0);
  const hrs = ls.map((l) => l.avgHr).filter((x): x is number => x != null);
  const maxs = ls.map((l) => l.maxHr).filter((x): x is number => x != null);
  const paces = ls.map(paceSecPerKm).filter((x): x is number => x != null);
  return {
    count: ls.length,
    avgDistanceM: dist / ls.length,
    avgElapsedS: time / ls.length,
    paceS: dist > 0 ? time / (dist / 1000) : null,
    avgHr: hrs.length ? Math.round(hrs.reduce((s, x) => s + x, 0) / hrs.length) : null,
    maxHr: maxs.length ? Math.max(...maxs) : null,
    bestPaceS: paces.length ? Math.min(...paces) : null,
    worstPaceS: paces.length ? Math.max(...paces) : null,
  };
}

/**
 * Lê as voltas: se há dois ritmos bem distintos (2 grupos de velocidade com razão >= 1,2 e pelo menos
 * 2 voltas rápidas), é intervalado: as rápidas são tiros, as lentas entre tiros são recuperação, as
 * lentas antes do primeiro tiro são aquecimento e depois do último, desaquecimento.
 */
export function readLaps(laps: Lap[]): LapsReading {
  const usable = laps.filter((l) => l.distanceM > 0 && l.elapsedS > 0);
  const flat: LapsReading = { kind: "continuo", roles: laps.map(() => "volta"), work: null, rest: null };
  if (usable.length < 4) return flat;
  const v = (l: Lap) => l.distanceM / l.elapsedS;
  const speeds = usable.map(v);
  let lo = Math.min(...speeds), hi = Math.max(...speeds);
  for (let it = 0; it < 20; it++) {
    const fast = speeds.filter((s) => Math.abs(s - hi) <= Math.abs(s - lo));
    const slow = speeds.filter((s) => Math.abs(s - hi) > Math.abs(s - lo));
    if (!fast.length || !slow.length) return flat;
    const nh = fast.reduce((a, b) => a + b, 0) / fast.length, nl = slow.reduce((a, b) => a + b, 0) / slow.length;
    if (nh === hi && nl === lo) break;
    hi = nh; lo = nl;
  }
  const cut = (hi + lo) / 2;
  const isWork = (l: Lap) => l.distanceM > 0 && v(l) > cut;
  const workLaps = laps.filter(isWork);
  if (hi / lo < 1.2 || workLaps.length < 2 || workLaps.length === usable.length) return flat;
  const firstWork = laps.findIndex(isWork);
  const lastWork = laps.length - 1 - [...laps].reverse().findIndex(isWork);
  const roles: LapRole[] = laps.map((l, i) => (isWork(l) ? "tiro" : i < firstWork ? "aquecimento" : i > lastWork ? "desaquecimento" : "recuperacao"));
  return {
    kind: "intervalado",
    roles,
    work: group(workLaps),
    rest: group(laps.filter((_, i) => roles[i] === "recuperacao")),
  };
}
