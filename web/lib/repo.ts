// Acesso a dados. Toda consulta filtra por athlete_id.
import { sql, ensureSchema } from "./db";
import type { Activity, HrZone, Kind, Physiology, Planned, Sport } from "./domain";
import { activityDate, type ImportPayload, type Workout } from "./import-schema";
import type { Race } from "./races";
import type { Lap } from "./laps";

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
  hrZones: { min_bpm: number; seconds: number }[] | null; source: string; laps?: Lap[] | null;
};

export async function getActivities(athleteId: string, from: string, to: string): Promise<Activity[]> {
  const rows = await sql<ActivityRow[]>`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, start_time AS "startTime", sport, kind, name,
           duration_s AS "durationS", distance_m AS "distanceM", elevation_gain_m AS "elevGainM",
           avg_hr AS "avgHr", max_hr AS "maxHr", hr_zones AS "hrZones", source, laps
    FROM activities
    WHERE athlete_id = ${athleteId} AND date BETWEEN ${from} AND ${to}
    ORDER BY start_time`;
  return rows.map((r) => ({
    ...r,
    startTime: r.startTime.toISOString(),
    hrZones: r.hrZones?.map((z): HrZone => ({ minBpm: z.min_bpm, seconds: z.seconds })) ?? null,
  }));
}

export async function getActivity(athleteId: string, id: string): Promise<Activity | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql<ActivityRow[]>`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, start_time AS "startTime", sport, kind, name,
           duration_s AS "durationS", distance_m AS "distanceM", elevation_gain_m AS "elevGainM",
           avg_hr AS "avgHr", max_hr AS "maxHr", hr_zones AS "hrZones", source
    FROM activities WHERE athlete_id = ${athleteId} AND id = ${id}`;
  if (!r) return null;
  return { ...r, startTime: r.startTime.toISOString(), hrZones: r.hrZones?.map((z): HrZone => ({ minBpm: z.min_bpm, seconds: z.seconds })) ?? null };
}

export async function getPlanned(athleteId: string, from: string, to: string): Promise<Planned[]> {
  return sql<Planned[]>`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, sport, kind, title, notes,
           target_duration_s AS "targetDurationS", target_distance_m AS "targetDistanceM",
           target_hr_max AS "targetHrMax", optional, source, workout_slug AS workout
    FROM planned_sessions
    WHERE athlete_id = ${athleteId} AND date BETWEEN ${from} AND ${to}
    ORDER BY date, CASE sport WHEN 'run' THEN 0 WHEN 'strength' THEN 1 ELSE 2 END, created_at`;
}

export async function getRaces(athleteId: string, from: string, to: string): Promise<Race[]> {
  return sql<Race[]>`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, name, distance_m AS "distanceM", elevation_gain_m AS "elevGainM",
           priority, goal_time_s AS "goalTimeS", notes, source
    FROM races WHERE athlete_id = ${athleteId} AND date BETWEEN ${from} AND ${to}
    ORDER BY date`;
}

/** Provas já corridas: atividades marcadas como prova. */
export async function getRaceResults(athleteId: string, from: string, to: string): Promise<Activity[]> {
  return (await getActivities(athleteId, from, to)).filter((a) => a.kind === "prova").reverse();
}

export async function getWorkout(athleteId: string, slug: string): Promise<Workout | null> {
  const [r] = await sql<{ content: Workout }[]>`SELECT content FROM workouts WHERE athlete_id = ${athleteId} AND slug = ${slug}`;
  return r?.content ?? null;
}

/** Lote que referencia um treino de força inexistente: recusado inteiro (vira 422 na rota). */
export class ImportRefError extends Error {}

export async function lastImport(athleteId: string): Promise<Date | null> {
  const [r] = await sql<{ at: Date }[]>`SELECT max(received_at) AS at FROM import_log WHERE athlete_id = ${athleteId}`;
  return r?.at ?? null;
}

export type ImportResult = { planned: number; activities: number; workouts: number; races: number; removed: number; zones: number };

/** Grava o lote numa transação única: ou entra tudo, ou nada. */
export async function applyImport(athlete: Athlete, p: ImportPayload): Promise<ImportResult> {
  await ensureSchema();
  return sql.begin(async (tx) => {
    for (const w of p.workouts) {
      await tx`
        INSERT INTO workouts (athlete_id, slug, content) VALUES (${athlete.id}, ${w.slug}, ${tx.json(w)})
        ON CONFLICT (athlete_id, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`;
    }
    const refs = [...new Set(p.planned.map((x) => x.workout).filter((s): s is string => !!s))];
    if (refs.length) {
      const found = await tx<{ slug: string }[]>`SELECT slug FROM workouts WHERE athlete_id = ${athlete.id} AND slug = ANY(${refs}::text[])`;
      const missing = refs.filter((s) => !found.some((f) => f.slug === s));
      if (missing.length) throw new ImportRefError(`treino de força inexistente: ${missing.join(", ")}`);
    }
    let removed = 0;
    for (const r of p.races_replace ?? []) {
      const keep = p.races.filter((x) => x.source === r.source).map((x) => x.external_id);
      const res = await tx`
        DELETE FROM races
        WHERE athlete_id = ${athlete.id} AND source = ${r.source} AND date BETWEEN ${r.from} AND ${r.to}
          AND NOT (external_id = ANY(${keep}::text[]))`;
      removed += res.count;
    }
    for (const x of p.races) {
      await tx`
        INSERT INTO races (athlete_id, source, external_id, date, name, distance_m, elevation_gain_m, priority, goal_time_s, notes)
        VALUES (${athlete.id}, ${x.source}, ${x.external_id}, ${x.date}, ${x.name}, ${x.distance_m}, ${x.elevation_gain_m ?? null},
                ${x.priority}, ${x.goal_time_s ?? null}, ${x.notes ?? null})
        ON CONFLICT (athlete_id, source, external_id) DO UPDATE SET
          date = EXCLUDED.date, name = EXCLUDED.name, distance_m = EXCLUDED.distance_m,
          elevation_gain_m = EXCLUDED.elevation_gain_m, priority = EXCLUDED.priority,
          goal_time_s = EXCLUDED.goal_time_s, notes = EXCLUDED.notes, updated_at = now()`;
    }
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
           target_duration_s, target_distance_m, target_hr_max, optional, workout_slug)
        VALUES (${athlete.id}, ${x.source}, ${x.external_id}, ${x.date}, ${x.sport}, ${x.kind}, ${x.title},
                ${x.notes ?? null}, ${x.target_duration_s ?? null}, ${x.target_distance_m ?? null},
                ${x.target_hr_max ?? null}, ${x.optional ?? false}, ${x.workout ?? null})
        ON CONFLICT (athlete_id, source, external_id) DO UPDATE SET
          date = EXCLUDED.date, sport = EXCLUDED.sport, kind = EXCLUDED.kind, title = EXCLUDED.title,
          notes = EXCLUDED.notes, target_duration_s = EXCLUDED.target_duration_s,
          target_distance_m = EXCLUDED.target_distance_m, target_hr_max = EXCLUDED.target_hr_max,
          optional = EXCLUDED.optional, workout_slug = EXCLUDED.workout_slug, updated_at = now()`;
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
    // Zonas de FC em corridas existentes (a mais próxima do início, até 10 min).
    let zonesSet = 0;
    for (const z of p.zones ?? []) {
      const res = await tx`
        UPDATE activities SET hr_zones = ${tx.json(z.hr_zones)}, updated_at = now()
        WHERE id = (
          SELECT id FROM activities
          WHERE athlete_id = ${athlete.id} AND sport = 'run'
            AND start_time BETWEEN ${new Date(Date.parse(z.start_time) - 600_000)} AND ${new Date(Date.parse(z.start_time) + 600_000)}
          ORDER BY abs(extract(epoch FROM start_time - ${new Date(z.start_time)}::timestamptz)) LIMIT 1)`;
      zonesSet += res.count;
    }
    await tx`
      INSERT INTO import_log (athlete_id, planned, activities, removed)
      VALUES (${athlete.id}, ${p.planned.length}, ${p.activities.length}, ${removed})`;
    return { planned: p.planned.length, activities: p.activities.length, workouts: p.workouts.length, races: p.races.length, removed, zones: zonesSet };
  });
}
