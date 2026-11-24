// Feedback de IA de uma corrida: junta os dados, chama a IA ativa (askAi) e grava o resultado estruturado.
// Todas as consultas filtram por athlete_id: um atleta nunca lê nem gera feedback de outro.
import { sql, ensureSchema } from "../db";
import { getActivities, getActivity, getPhysiology, getPlanned, type Athlete } from "../repo";
import { addDays, inferKinds } from "../domain";
import { loadLaps } from "../sync";
import { askAi } from "./store";
import { FEEDBACK_MAX_TOKENS, FEEDBACK_TASK, FEEDBACK_VERSION, buildRunPayload, parseFeedback, type FeedbackStructured, type SimilarRun } from "./feedback";

export type StoredFeedback = {
  id: number;
  createdAt: string;
  provider: string;
  model: string;
  structured: FeedbackStructured | null;
  rawText: string;
};

export async function getLatestFeedback(athleteId: string, activityId: string): Promise<StoredFeedback | null> {
  if (!/^[0-9a-f-]{36}$/i.test(activityId)) return null;
  await ensureSchema();
  const [r] = await sql<StoredFeedback[]>`
    SELECT id::int, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt", provider, model, structured, raw_text AS "rawText"
    FROM run_feedback WHERE athlete_id = ${athleteId} AND activity_id = ${activityId}
    ORDER BY created_at DESC, id DESC LIMIT 1`;
  return r ?? null;
}

export class FeedbackError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// Evita duas gerações simultâneas da mesma corrida (duplo toque no botão): a segunda espera a primeira terminar.
const inFlight = new Set<string>();

export async function generateRunFeedback(athlete: Athlete, activityId: string): Promise<StoredFeedback> {
  await ensureSchema();
  const raw = await getActivity(athlete.id, activityId);
  if (!raw) throw new FeedbackError("Treino não encontrado.", 404);
  // O botão só existe depois da corrida feita: precisa ser uma corrida realizada, já com duração e data passada ou de hoje.
  if (raw.sport !== "run") throw new FeedbackError("O feedback é só para corridas.", 400);
  const key = `${athlete.id}:${raw.id}`;
  if (inFlight.has(key)) throw new FeedbackError("Já estou gerando o feedback desta corrida. Aguarde alguns segundos.", 409);
  inFlight.add(key);
  try {
    const phys = await getPhysiology(athlete.id, raw.date);
    if (!phys) throw new FeedbackError("Sem limiares cadastrados para esta data.", 422);
    const planned = await getPlanned(athlete.id, raw.date, raw.date);
    const [activity] = inferKinds([raw], planned);
    const plan = planned.find((p) => p.sport === "run") ?? null;
    const { laps } = await loadLaps(athlete, activity.id);

    // Até 3 corridas anteriores do mesmo tipo (qualquer corrida, se o tipo for genérico), nos 90 dias antes.
    const prev = await getActivities(athlete.id, addDays(activity.date, -90), activity.date);
    const generic = activity.kind === "corrida";
    const similar: SimilarRun[] = prev
      .filter((p) => p.sport === "run" && p.id !== activity.id && p.startTime < activity.startTime && (generic || p.kind === activity.kind))
      .sort((a, b) => b.startTime.localeCompare(a.startTime))
      .slice(0, 3)
      .map((p) => ({ date: p.date, distanceM: p.distanceM, durationS: p.durationS, avgHr: p.avgHr }));

    const payload = buildRunPayload({ activity, plan, phys, laps, similar });
    const r = await askAi(athlete.id, "feedback-corrida", { system: FEEDBACK_TASK, text: payload.text, maxTokens: FEEDBACK_MAX_TOKENS, json: true }, athlete.timezone);
    const structured = parseFeedback(r.text);
    // Resumo numérico do que foi enviado, para análises futuras sem reabrir o ai_runs.
    const summary = {
      version: FEEDBACK_VERSION, compact: payload.compact, payloadTokensEst: payload.tokens,
      activityDate: activity.date, kind: activity.kind, lapsUsed: laps?.length ?? 0, plannedId: plan?.id ?? null, similarRuns: similar.length,
      physValidFrom: phys.validFrom,
    };
    const [row] = await sql<StoredFeedback[]>`
      INSERT INTO run_feedback (athlete_id, activity_id, ai_run_id, payload_version, provider, model, verdict, intensity, structured, raw_text, input_summary)
      VALUES (${athlete.id}, ${activity.id}, ${r.runId}, ${FEEDBACK_VERSION}, ${r.provider}, ${r.model}, ${structured?.veredito ?? null}, ${structured?.intensidade ?? null},
              ${structured ? sql.json(structured) : null}, ${r.text}, ${sql.json(summary)})
      RETURNING id::int, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt", provider, model, structured, raw_text AS "rawText"`;
    return row;
  } finally {
    inFlight.delete(key);
  }
}
