// Converte o lote de importação para os tipos de domínio (sem banco). Usado nos testes
// e como referência do que o banco grava a partir de cada campo.
import type { Activity, Planned } from "./domain.ts";
import { activityDate, type ImportPayload } from "./import-schema.ts";

export function payloadActivities(p: ImportPayload, timeZone: string): Activity[] {
  return p.activities.map((a) => ({
    id: `${a.source}:${a.external_id}`,
    date: activityDate(a.start_time, timeZone),
    startTime: new Date(a.start_time).toISOString(),
    sport: a.sport,
    kind: a.kind,
    name: a.name,
    durationS: a.duration_s,
    distanceM: a.distance_m ?? null,
    elevGainM: a.elevation_gain_m ?? null,
    avgHr: a.avg_hr ?? null,
    maxHr: a.max_hr ?? null,
    hrZones: a.hr_zones?.map((z) => ({ minBpm: z.min_bpm, seconds: z.seconds })) ?? null,
    source: a.source,
  }));
}

export function payloadPlanned(p: ImportPayload): Planned[] {
  return p.planned.map((x) => ({
    id: `${x.source}:${x.external_id}`,
    date: x.date,
    sport: x.sport,
    kind: x.kind,
    title: x.title,
    notes: x.notes ?? null,
    targetDurationS: x.target_duration_s ?? null,
    targetDistanceM: x.target_distance_m ?? null,
    targetHrMax: x.target_hr_max ?? null,
    optional: x.optional ?? false,
    source: x.source,
  }));
}
