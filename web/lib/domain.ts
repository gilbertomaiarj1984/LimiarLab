// Regras de domínio do LimiarLab: funções puras, sem banco e sem React, para poderem ser testadas.
// Datas de calendário são strings "YYYY-MM-DD" no fuso do atleta; nunca objetos Date locais
// (um Date local muda de dia conforme o fuso do servidor).

export type Sport = "run" | "strength" | "other";

export const KINDS = [
  "corrida_leve",
  "longo",
  "qualidade",
  "prova",
  "corrida",
  "forca_inferiores",
  "forca_superiores",
  "forca",
  "mobilidade",
  "descanso",
  "outro",
] as const;
export type Kind = (typeof KINDS)[number];

export type HrZone = { minBpm: number; seconds: number };

export type Activity = {
  id: string;
  date: string;
  startTime: string;
  sport: Sport;
  kind: Kind;
  /** true quando o tipo veio do plano do dia, não do registro. */
  kindInferred?: boolean;
  name: string;
  durationS: number;
  distanceM: number | null;
  elevGainM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  hrZones: HrZone[] | null;
  source: string;
};

export type Planned = {
  id: string;
  date: string;
  sport: Sport;
  kind: Kind;
  title: string;
  notes: string | null;
  targetDurationS: number | null;
  targetDistanceM: number | null;
  targetHrMax: number | null;
  optional: boolean;
  source: string;
};

export type Physiology = {
  /** Limiar ventilatório 1: fronteira do leve. */
  lv1: number;
  /** Limiar ventilatório 2. */
  lv2: number;
  /** A partir desta FC o tempo conta como forte (regra prática; Z5 do Garmin). */
  hardFrom: number;
  /** Teto de FC dos dias leves. */
  easyTarget: number;
  /** Teto de FC para a maior parte do longo. */
  longTarget: number;
};

// ---------- Datas ----------

const DAY_MS = 86_400_000;
const toUtcNoon = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = toUtcNoon(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export function addDays(iso: string, n: number): string {
  return new Date(toUtcNoon(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = segunda ... 6 = domingo. */
export function weekdayIndex(iso: string): number {
  return (new Date(toUtcNoon(iso)).getUTCDay() + 6) % 7;
}

/** Segunda-feira da semana que contém a data. */
export function weekStart(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Data de calendário de um instante no fuso informado. */
export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hora "HH:MM" de um instante no fuso informado. */
export function localTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

// ---------- Intensidade ----------

export type IntensitySplit = { easy: number; moderate: number; hard: number; total: number };

/**
 * Divide o tempo em zonas de FC em três faixas (modelo de 3 zonas):
 * leve = zona inteira abaixo do LV1; forte = zona que começa em `hardFrom` ou acima;
 * o resto é moderado. Uma zona que atravessa o LV1 conta como moderada (conservador:
 * nunca chama de leve um tempo que pode ter passado do limiar).
 */
export function intensitySplit(zones: HrZone[], phys: Physiology): IntensitySplit {
  const sorted = [...zones].sort((a, b) => a.minBpm - b.minBpm);
  const out: IntensitySplit = { easy: 0, moderate: 0, hard: 0, total: 0 };
  sorted.forEach((z, i) => {
    const s = Math.max(0, z.seconds);
    const upper = i + 1 < sorted.length ? sorted[i + 1].minBpm : Infinity;
    if (z.minBpm >= phys.hardFrom) out.hard += s;
    else if (upper <= phys.lv1) out.easy += s;
    else out.moderate += s;
    out.total += s;
  });
  return out;
}

export function sumSplits(splits: IntensitySplit[]): IntensitySplit {
  return splits.reduce(
    (a, b) => ({
      easy: a.easy + b.easy,
      moderate: a.moderate + b.moderate,
      hard: a.hard + b.hard,
      total: a.total + b.total,
    }),
    { easy: 0, moderate: 0, hard: 0, total: 0 },
  );
}

/** Percentuais inteiros que sempre somam 100 (maior resto). */
export function splitPercents(s: IntensitySplit): { easy: number; moderate: number; hard: number } | null {
  if (s.total <= 0) return null;
  const raw = [s.easy, s.moderate, s.hard].map((v) => (v / s.total) * 100);
  const floor = raw.map(Math.floor);
  let rest = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - floor[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    floor[i] += 1;
    rest -= 1;
  }
  return { easy: floor[0], moderate: floor[1], hard: floor[2] };
}

export const EASY_KINDS: Kind[] = ["corrida_leve", "longo"];

/** Dia que deveria ser leve e saiu com FC média no LV1 ou acima. */
export function easyDayOffTarget(a: Activity, phys: Physiology): boolean {
  return a.sport === "run" && EASY_KINDS.includes(a.kind) && a.avgHr != null && a.avgHr >= phys.lv1;
}

// ---------- Plano x realizado ----------

const STRENGTH_SPECIFIC: Kind[] = ["forca_inferiores", "forca_superiores"];

/**
 * O Garmin registra só "força". Se no mesmo dia houver exatamente um treino de força
 * planejado com subtipo (inferiores ou superiores), o realizado herda esse subtipo,
 * marcado como inferido. Corridas com tipo genérico herdam o tipo do plano do dia do mesmo jeito.
 */
export function inferKinds(activities: Activity[], planned: Planned[]): Activity[] {
  return activities.map((a) => {
    const generic = (a.sport === "strength" && a.kind === "forca") || (a.sport === "run" && a.kind === "corrida");
    if (!generic) return a;
    const candidates = planned.filter(
      (p) => p.date === a.date && p.sport === a.sport && p.kind !== a.kind &&
        (a.sport === "run" || STRENGTH_SPECIFIC.includes(p.kind)),
    );
    if (candidates.length !== 1) return a;
    return { ...a, kind: candidates[0].kind, kindInferred: true };
  });
}

export type PlanStatus = "feito" | "pendente" | "sem_registro" | "opcional" | "descanso";
export type PlanItem = Planned & { status: PlanStatus; activityId: string | null };

/** Liga cada treino planejado a um realizado do mesmo dia e esporte (um para um, na ordem). */
export function matchPlan(planned: Planned[], activities: Activity[], today: string): PlanItem[] {
  const used = new Set<string>();
  const byTime = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return planned.map((p) => {
    if (p.kind === "descanso") return { ...p, status: "descanso", activityId: null };
    const hit = byTime.find(
      (a) => !used.has(a.id) && a.date === p.date && a.sport === p.sport && p.sport !== "other",
    );
    if (hit) {
      used.add(hit.id);
      return { ...p, status: "feito", activityId: hit.id };
    }
    if (p.optional) return { ...p, status: "opcional", activityId: null };
    return { ...p, status: p.date < today ? "sem_registro" : "pendente", activityId: null };
  });
}

// ---------- Estatísticas da semana ----------

export type WeekStats = {
  run: { km: number; seconds: number; count: number; elevGainM: number; longestKm: number; longestName: string | null };
  strength: { count: number; seconds: number; lower: number; upper: number; other: number };
  totalSeconds: number;
  intensity: IntensitySplit;
  plan: { doneDue: number; due: number; total: number };
  volume: {
    prevKm: number;
    currentKm: number;
    plannedRemainingKm: number;
    projectedKm: number;
    /** Variação projetada vs. semana anterior (0,1 = +10%). null sem semana anterior. */
    delta: number | null;
    /** Salto acima de 30%. Referência cautelosa: Nielsen et al., 2014 (iniciantes, HR 1,59, IC95% 0,96–2,66, exploratório). */
    warn: boolean;
  };
};

export const VOLUME_JUMP_WARN = 0.3;

export function weekStats(
  activities: Activity[],
  plan: PlanItem[],
  prevWeekActivities: Activity[],
  phys: Physiology,
  today: string,
): WeekStats {
  const runs = activities.filter((a) => a.sport === "run");
  const strength = activities.filter((a) => a.sport === "strength");
  const km = (list: Activity[]) => list.reduce((s, a) => s + (a.distanceM ?? 0), 0) / 1000;
  const longest = runs.reduce<Activity | null>(
    (best, a) => ((a.distanceM ?? 0) > (best?.distanceM ?? -1) ? a : best),
    null,
  );
  const counted = plan.filter((p) => (p.sport === "run" || p.sport === "strength") && !p.optional && p.kind !== "descanso");
  const due = counted.filter((p) => p.date <= today);
  const plannedRemainingKm =
    plan
      .filter((p) => p.sport === "run" && p.status === "pendente" && p.targetDistanceM)
      .reduce((s, p) => s + (p.targetDistanceM ?? 0), 0) / 1000;
  const currentKm = km(runs);
  const prevKm = km(prevWeekActivities.filter((a) => a.sport === "run"));
  const projectedKm = currentKm + plannedRemainingKm;
  const delta = prevKm > 0 ? projectedKm / prevKm - 1 : null;
  return {
    run: {
      km: currentKm,
      seconds: runs.reduce((s, a) => s + a.durationS, 0),
      count: runs.length,
      elevGainM: runs.reduce((s, a) => s + (a.elevGainM ?? 0), 0),
      longestKm: longest ? (longest.distanceM ?? 0) / 1000 : 0,
      longestName: longest?.name ?? null,
    },
    strength: {
      count: strength.length,
      seconds: strength.reduce((s, a) => s + a.durationS, 0),
      lower: strength.filter((a) => a.kind === "forca_inferiores").length,
      upper: strength.filter((a) => a.kind === "forca_superiores").length,
      other: strength.filter((a) => !STRENGTH_SPECIFIC.includes(a.kind)).length,
    },
    totalSeconds: activities.reduce((s, a) => s + a.durationS, 0),
    intensity: sumSplits(runs.filter((a) => a.hrZones?.length).map((a) => intensitySplit(a.hrZones!, phys))),
    plan: { doneDue: due.filter((p) => p.status === "feito").length, due: due.length, total: counted.length },
    volume: { prevKm, currentKm, plannedRemainingKm, projectedKm, delta, warn: delta != null && delta > VOLUME_JUMP_WARN },
  };
}

// ---------- Rótulos ----------

export const KIND_LABEL: Record<Kind, string> = {
  corrida_leve: "Corrida leve",
  longo: "Longo",
  qualidade: "Qualidade",
  prova: "Prova",
  corrida: "Corrida",
  forca_inferiores: "Força · inferiores",
  forca_superiores: "Força · superiores",
  forca: "Força",
  mobilidade: "Core e mobilidade",
  descanso: "Descanso",
  outro: "Outro",
};

export const WEEKDAY_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
export const WEEKDAY_LONG = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function longDate(iso: string): string {
  return `${WEEKDAY_LONG[weekdayIndex(iso)]}, ${Number(iso.slice(8))} de ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

export function shortDate(iso: string): string {
  return `${Number(iso.slice(8))}/${iso.slice(5, 7)}`;
}
