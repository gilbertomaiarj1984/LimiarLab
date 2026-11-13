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

export const replaceSchema = z.object({ source, from: isoDate, to: isoDate }).strict()
  .refine((r) => r.from <= r.to, "from deve ser <= to");

export const importSchema = z.object({
  athlete: z.string().regex(/^[a-z0-9-]{2,40}$/),
  _comment: z.string().optional(),
  /** Planejados desta fonte no intervalo que não vierem no lote são apagados (o Garmin desmarcou). */
  planned_replace: z.array(replaceSchema).max(10).optional(),
  planned: z.array(plannedSchema).max(500).default([]),
  activities: z.array(activitySchema).max(500).default([]),
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
  seen.clear();
  for (const [i, x] of p.activities.entries()) {
    const k = `${x.source}:${x.external_id}`;
    if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["activities", i], message: `duplicado: ${k}` });
    seen.add(k);
  }
});

export type ImportPayload = z.infer<typeof importSchema>;

/** Data de calendário da atividade no fuso do atleta. */
export function activityDate(startTime: string, timeZone: string): string {
  return localDate(new Date(startTime), timeZone);
}
