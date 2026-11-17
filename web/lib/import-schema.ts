// Contrato do POST /api/import, usado pela rotina do Claude (e, no futuro, por outras fontes).
// Validação estrita: um campo errado recusa o lote inteiro, nada é gravado pela metade.
import { z } from "zod";
import { KINDS, isIsoDate, localDate } from "./domain.ts";

const isoDate = z.string().refine(isIsoDate, "data deve ser YYYY-MM-DD válida");
const source = z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/, "fonte em minúsculas, ex.: garmin");
const externalId = z.string().min(1).max(200);
const sport = z.enum(["run", "strength", "other"]);
const kind = z.enum(KINDS);
const bpm = z.number().int().min(30).max(250);

export const plannedSchema = z.object({
  source,
  external_id: externalId,
  date: isoDate,
  sport,
  kind,
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullish(),
  target_duration_s: z.number().int().positive().max(172_800).nullish(),
  target_distance_m: z.number().positive().max(500_000).nullish(),
  target_hr_max: bpm.nullish(),
  optional: z.boolean().optional(),
  workout: z.string().regex(/^[a-z0-9-]{2,60}$/).nullish(),
}).strict();

const text = (max: number) => z.string().min(1).max(max);
export const exerciseSchema = z.object({
  name: text(120),
  sets: z.number().int().min(1).max(10),
  reps: text(40),
  load: text(120).nullish(),
  focus: text(60).nullish(),
  tips: z.array(text(240)).max(6).nullish(),
  alternative: text(240).nullish(),
  /** Ilustração (chave em web/lib/figures.ts). */
  figure: z.string().regex(/^[a-z0-9-]{2,60}$/).nullish(),
  /** Descanso depois de cada série, para o contador da tela do treino. */
  rest_s: z.number().int().min(15).max(600).nullish(),
}).strict();

/** Treino de força detalhado, referenciado pelos planejados em `workout`. */
export const workoutSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  title: text(120),
  goal: text(400).nullish(),
  duration: text(40).nullish(),
  rir: text(40).nullish(),
  rest: text(40).nullish(),
  warmup: text(300).nullish(),
  load_note: text(400).nullish(),
  exercises: z.array(exerciseSchema).min(1).max(15),
  reference: text(400).nullish(),
}).strict();

export const activitySchema = z.object({
  source,
  external_id: externalId,
  start_time: z.string().refine(
    (s) => /([+-]\d{2}:\d{2}|Z)$/.test(s) && !Number.isNaN(Date.parse(s)),
    "start_time precisa de fuso, ex.: 2026-11-12T06:27:11-03:00",
  ),
  sport,
  kind,
  name: z.string().min(1).max(200),
  duration_s: z.number().positive().max(172_800),
  distance_m: z.number().min(0).max(500_000).nullish(),
  elevation_gain_m: z.number().min(0).max(20_000).nullish(),
  avg_hr: bpm.nullish(),
  max_hr: bpm.nullish(),
  hr_zones: z.array(z.object({ min_bpm: bpm, seconds: z.number().min(0) }).strict()).max(10).nullish(),
}).strict();

/** Prova no calendário. A = prova-alvo, B = no caminho, C = como treino. */
export const raceSchema = z.object({
  source,
  external_id: externalId,
  date: isoDate,
  name: z.string().min(1).max(160),
  distance_m: z.number().positive().max(500_000),
  elevation_gain_m: z.number().min(0).max(20_000).nullish(),
  priority: z.enum(["A", "B", "C"]),
  goal_time_s: z.number().int().positive().max(864_000).nullish(),
  notes: z.string().max(2000).nullish(),
}).strict();

export const replaceSchema = z.object({ source, from: isoDate, to: isoDate }).strict()
  .refine((r) => r.from <= r.to, "from deve ser <= to");

export const importSchema = z.object({
  athlete: z.string().regex(/^[a-z0-9-]{2,40}$/),
  _comment: z.string().optional(),
  /** Planejados desta fonte no intervalo que não vierem no lote são apagados (o Garmin desmarcou). */
  planned_replace: z.array(replaceSchema).max(10).optional(),
  planned: z.array(plannedSchema).max(500).default([]),
  activities: z.array(activitySchema).max(500).default([]),
  workouts: z.array(workoutSchema).max(30).default([]),
  /** Provas desta fonte no intervalo que não vierem no lote são apagadas (prova cancelada). */
  races_replace: z.array(replaceSchema).max(10).optional(),
  races: z.array(raceSchema).max(100).default([]),
}).strict().superRefine((p, ctx) => {
  for (const r of p.planned_replace ?? []) {
    p.planned.forEach((x, i) => {
      if (x.source === r.source && (x.date < r.from || x.date > r.to)) {
        // Permitido, mas é quase sempre engano da rotina: recusa para não apagar/gravar fora do que se pretendia.
        ctx.addIssue({ code: "custom", path: ["planned", i, "date"], message: `fora do intervalo de planned_replace de ${r.source}` });
      }
    });
  }
  const seen = new Set<string>();
  for (const [i, x] of p.planned.entries()) {
    const k = `${x.source}:${x.external_id}`;
    if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["planned", i], message: `duplicado: ${k}` });
    seen.add(k);
  }
  for (const r of p.races_replace ?? []) {
    p.races.forEach((x, i) => {
      if (x.source === r.source && (x.date < r.from || x.date > r.to)) {
        ctx.addIssue({ code: "custom", path: ["races", i, "date"], message: `fora do intervalo de races_replace de ${r.source}` });
      }
    });
  }
  seen.clear();
  for (const [i, x] of p.races.entries()) {
    const k = `${x.source}:${x.external_id}`;
    if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["races", i], message: `duplicado: ${k}` });
    seen.add(k);
  }
  seen.clear();
  for (const [i, w] of p.workouts.entries()) {
    if (seen.has(w.slug)) ctx.addIssue({ code: "custom", path: ["workouts", i], message: `duplicado: ${w.slug}` });
    seen.add(w.slug);
  }
  seen.clear();
  for (const [i, x] of p.activities.entries()) {
    const k = `${x.source}:${x.external_id}`;
    if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["activities", i], message: `duplicado: ${k}` });
    seen.add(k);
  }
});

export type ImportPayload = z.infer<typeof importSchema>;
export type Workout = z.infer<typeof workoutSchema>;

/** Data de calendário da atividade no fuso do atleta. */
export function activityDate(startTime: string, timeZone: string): string {
  return localDate(new Date(startTime), timeZone);
}
