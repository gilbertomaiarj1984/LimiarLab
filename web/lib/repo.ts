// Acesso a dados. Toda consulta filtra por athlete_id.
import { sql, ensureSchema } from "./db";
import type { Activity, HrZone, Kind, Physiology, Planned, Sport } from "./domain";
import { activityDate, type ImportPayload } from "./import-schema";

export type Athlete = { id: string; slug: string; name: string; timezone: string; goal: string | null };
export type PhysiologyRow = Physiology & { validFrom: string; hrMax: number | null; vo2max: number | null; source: string };

export async function getAthlete(slug: string): Promise<Athlete | null> {
  await ensureSchema();
  const [a] = await sql<Athlete[]>`SELECT id, slug, name, timezone, goal FROM athletes WHERE slug = ${slug}`;
  return a ?? null;
}

export async function listAthletes(): Promise<Athlete[]> {
  await ensureSchema();
  return sql<Athlete[]>`SELECT id, slug, name, timezone, goal FROM athletes ORDER BY created_at`;
}

/** Fisiologia vigente na data (o registro mais recente com valid_from <= data). */
export async function getPhysiology(athleteId: string, onDate: string): Promise<PhysiologyRow | null> {
  const [p] = await sql<PhysiologyRow[]>`
    SELECT to_char(valid_from, 'YYYY-MM-DD') AS "validFrom", lv1, lv2, hard_from AS "hardFrom",
           easy_target AS "easyTarget", long_target AS "longTarget", hr_max AS "hrMax", vo2max, source
    FROM athlete_physiology
    WHERE athlete_id = ${athleteId} AND valid_from <= ${onDate}
    ORDER BY valid_from DESC LIMIT 1`;
  return p ?? null;
}

type ActivityRow = {
  id: string; date: string; startTime: Date; sport: Sport; kind: Kind; name: string; durationS: number;
  distanceM: number | null; elevGainM: number | null; avgHr: number | null; maxHr: number | null;
  hrZones: { min_bpm: number; seconds: number }[] | null; source: string;
};

export async function getActivities(athleteId: string, from: string, to: string): Promise<Activity[]> {
  const rows = await sql<ActivityRow[]>`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, start_time AS "startTime", sport, kind, name,
           duration_s AS "durationS", distance_m AS "distanceM", elevation_gain_m AS "elevGainM",
           avg_hr AS "avgHr", max_hr AS "maxHr", hr_zones AS "hrZones", source
    FROM activities
    WHERE athlete_id = ${athleteId} AND date BETWEEN ${from} AND ${to}
    ORDER BY start_time`;
  return rows.map((r) => ({
    ...r,
    startTime: r.startTime.toISOString(),
    hrZones: r.hrZones?.map((z): HrZone => ({ minBpm: z.min_bpm, seconds: z.seconds })) ?? null,
  }));
}

export async function getPlanned(athleteId: string, from: string, to: string): Promise<Planned[]> {
  return sql<Planned[]>`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, sport, kind, title, notes,
           target_duration_s AS "targetDurationS", target_distance_m AS "targetDistanceM",
           target_hr_max AS "targetHrMax", optional, source
    FROM planned_sessions
    WHERE athlete_id = ${athleteId} AND date BETWEEN ${from} AND ${to}
    ORDER BY date, CASE sport WHEN 'run' THEN 0 WHEN 'strength' THEN 1 ELSE 2 END, created_at`;
}

export async function lastImport(athleteId: string): Promise<Date | null> {
  const [r] = await sql<{ at: Date }[]>`SELECT max(received_at) AS at FROM import_log WHERE athlete_id = ${athleteId}`;
  return r?.at ?? null;
}

export type ImportResult = { planned: number; activities: number; removed: number };

/** Grava o lote numa transação única: ou entra tudo, ou nada. */
export async function applyImport(athlete: Athlete, p: ImportPayload): Promise<ImportResult> {
  await ensureSchema();
  return sql.begin(async (tx) => {
    let removed = 0;
    for (const r of p.planned_replace ?? []) {
      const keep = p.planned.filter((x) => x.source === r.source).map((x) => x.external_id);
      const res = await tx`
        DELETE FROM planned_sessions
        WHERE athlete_id = ${athlete.id} AND source = ${r.source} AND date BETWEEN ${r.from} AND ${r.to}
          AND NOT (external_id = ANY(${keep}::text[]))`;
      removed += res.count;
    }
    for (const x of p.planned) {
      await tx`
        INSERT INTO planned_sessions
          (athlete_id, source, external_id, date, sport, kind, title, notes,
           target_duration_s, target_distance_m, target_hr_max, optional)
        VALUES (${athlete.id}, ${x.source}, ${x.external_id}, ${x.date}, ${x.sport}, ${x.kind}, ${x.title},
                ${x.notes ?? null}, ${x.target_duration_s ?? null}, ${x.target_distance_m ?? null},
                ${x.target_hr_max ?? null}, ${x.optional ?? false})
        ON CONFLICT (athlete_id, source, external_id) DO UPDATE SET
          date = EXCLUDED.date, sport = EXCLUDED.sport, kind = EXCLUDED.kind, title = EXCLUDED.title,
          notes = EXCLUDED.notes, target_duration_s = EXCLUDED.target_duration_s,
          target_distance_m = EXCLUDED.target_distance_m, target_hr_max = EXCLUDED.target_hr_max,
          optional = EXCLUDED.optional, updated_at = now()`;
    }
    for (const a of p.activities) {
      const zones = a.hr_zones ? tx.json(a.hr_zones) : null;
      await tx`
        INSERT INTO activities
          (athlete_id, source, external_id, start_time, date, sport, kind, name, duration_s, distance_m,
           elevation_gain_m, avg_hr, max_hr, hr_zones)
        VALUES (${athlete.id}, ${a.source}, ${a.external_id}, ${a.start_time},
                ${activityDate(a.start_time, athlete.timezone)}, ${a.sport}, ${a.kind}, ${a.name}, ${a.duration_s},
                ${a.distance_m ?? null}, ${a.elevation_gain_m ?? null}, ${a.avg_hr ?? null}, ${a.max_hr ?? null}, ${zones})
        ON CONFLICT (athlete_id, source, external_id) DO UPDATE SET
          start_time = EXCLUDED.start_time, date = EXCLUDED.date, sport = EXCLUDED.sport, kind = EXCLUDED.kind,
          name = EXCLUDED.name, duration_s = EXCLUDED.duration_s, distance_m = EXCLUDED.distance_m,
          elevation_gain_m = EXCLUDED.elevation_gain_m, avg_hr = EXCLUDED.avg_hr, max_hr = EXCLUDED.max_hr,
          hr_zones = EXCLUDED.hr_zones, updated_at = now()`;
    }
    await tx`
      INSERT INTO import_log (athlete_id, planned, activities, removed)
      VALUES (${athlete.id}, ${p.planned.length}, ${p.activities.length}, ${removed})`;
    return { planned: p.planned.length, activities: p.activities.length, removed };
  });
}
