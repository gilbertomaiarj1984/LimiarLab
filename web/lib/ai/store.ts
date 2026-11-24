// Configuração de IA por atleta e histórico das chamadas. Só servidor.
import { sql, ensureSchema } from "../db";
import { AI_PROVIDERS, isAiProvider, normalizeModel, type AiProvider } from "./providers";
import { providerConfigured, runText, type AiRequest, type AiResult } from "./run";

export type AiSettings = { provider: AiProvider; models: Record<AiProvider, string> };

export function configuredMap(): Record<AiProvider, boolean> {
  return { anthropic: providerConfigured("anthropic"), gemini: providerConfigured("gemini"), groq: providerConfigured("groq") };
}

function build(provider: unknown, models: unknown): AiSettings {
  const m = (models && typeof models === "object" ? models : {}) as Record<string, unknown>;
  return {
    provider: isAiProvider(provider) ? provider : "anthropic",
    models: Object.fromEntries(AI_PROVIDERS.map((p) => [p, normalizeModel(p, m[p])])) as Record<AiProvider, string>,
  };
}

export async function getAiSettings(athleteId: string): Promise<AiSettings> {
  await ensureSchema();
  const [r] = await sql<{ provider: string; models: unknown }[]>`SELECT provider, models FROM ai_settings WHERE athlete_id = ${athleteId}`;
  return build(r?.provider, r?.models);
}

export async function saveAiSettings(athleteId: string, provider: unknown, models: unknown): Promise<AiSettings> {
  await ensureSchema();
  const s = build(provider, models);
  await sql`
    INSERT INTO ai_settings (athlete_id, provider, models) VALUES (${athleteId}, ${s.provider}, ${sql.json(s.models)})
    ON CONFLICT (athlete_id) DO UPDATE SET provider = EXCLUDED.provider, models = EXCLUDED.models, updated_at = now()`;
  return s;
}

/**
 * Ponto único para qualquer análise de IA do app: usa o provedor escolhido, faz failover
 * e grava a chamada em ai_runs (sucesso ou falha). `kind` nomeia a análise ("teste", "relatorio-semanal"...).
 */
export async function askAi(athleteId: string, kind: string, req: AiRequest): Promise<AiResult> {
  const s = await getAiSettings(athleteId);
  const input = { system: req.system, text: req.text, maxTokens: req.maxTokens, json: req.json ?? false };
  try {
    const r = await runText(req, s.provider, s.models);
    await sql`
      INSERT INTO ai_runs (athlete_id, kind, requested_provider, provider, model, switched, ok, attempt_errors, input, output, input_tokens, output_tokens, latency_ms)
      VALUES (${athleteId}, ${kind}, ${s.provider}, ${r.provider}, ${r.model}, ${r.switched}, true, ${sql.json(r.attemptErrors)}, ${sql.json(input)}, ${r.text}, ${r.inputTokens}, ${r.outputTokens}, ${r.latencyMs})`;
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha desconhecida";
    await sql`
      INSERT INTO ai_runs (athlete_id, kind, requested_provider, ok, error, input)
      VALUES (${athleteId}, ${kind}, ${s.provider}, false, ${msg.slice(0, 500)}, ${sql.json(input)})`.catch(() => {});
    throw e;
  }
}

export type AiRunRow = { id: number; at: string; kind: string; provider: string | null; model: string | null; switched: boolean; ok: boolean; error: string | null; inputTokens: number | null; outputTokens: number | null; latencyMs: number | null };

export async function recentAiRuns(athleteId: string, limit = 5): Promise<AiRunRow[]> {
  await ensureSchema();
  return sql<AiRunRow[]>`
    SELECT id::int, created_at::text AS at, kind, provider, model, switched, ok, error,
           input_tokens AS "inputTokens", output_tokens AS "outputTokens", latency_ms AS "latencyMs"
    FROM ai_runs WHERE athlete_id = ${athleteId} ORDER BY created_at DESC LIMIT ${limit}`;
}
