// Configuração de IA por atleta e histórico das chamadas. Só servidor.
import { sql, ensureSchema } from "../db";
import { getActivities, getPhysiology, getPlanned, getRaces, getStrengthLogs } from "../repo";
import { addDays, localDate, weekStart } from "../domain";
import { formatEstado } from "./estado";
import { MAX_DIRECTIVE_CHARS, buildSystem, defaultDirectiveFor } from "./directive";
import { AI_PROVIDERS, isAiProvider, normalizeModel, type AiProvider } from "./providers";
import { providerConfigured, runText, type AiRequest, type AiResult } from "./run";

export type AiSettings = { provider: AiProvider; models: Record<AiProvider, string>; directive: string; defaultDirective: string; directiveIsDefault: boolean };

export function configuredMap(): Record<AiProvider, boolean> {
  return { anthropic: providerConfigured("anthropic"), gemini: providerConfigured("gemini"), groq: providerConfigured("groq") };
}

function build(athlete: { slug: string; name: string }, provider: unknown, models: unknown, directive?: unknown): AiSettings {
  const base = defaultDirectiveFor(athlete);
  const m = (models && typeof models === "object" ? models : {}) as Record<string, unknown>;
  const custom = typeof directive === "string" && directive.trim() ? directive.trim().slice(0, MAX_DIRECTIVE_CHARS) : null;
  return {
    provider: isAiProvider(provider) ? provider : "anthropic",
    models: Object.fromEntries(AI_PROVIDERS.map((p) => [p, normalizeModel(p, m[p])])) as Record<AiProvider, string>,
    directive: custom ?? base,
    defaultDirective: base,
    directiveIsDefault: custom === null || custom === base.trim(),
  };
}

export async function getAiSettings(athleteId: string): Promise<AiSettings> {
  await ensureSchema();
  const [a] = await sql<{ slug: string; name: string }[]>`SELECT slug, name FROM athletes WHERE id = ${athleteId}`;
  if (!a) throw new Error("atleta não existe");
  const [r] = await sql<{ provider: string; models: unknown; directive: string | null }[]>`SELECT provider, models, directive FROM ai_settings WHERE athlete_id = ${athleteId}`;
  return build(a, r?.provider, r?.models, r?.directive);
}

/** `directive`: texto editado; vazio ou igual ao padrão volta a usar o padrão do código (assim melhorias no padrão chegam sozinhas). */
export async function saveAiSettings(athleteId: string, provider: unknown, models: unknown, directive?: unknown): Promise<AiSettings> {
  await ensureSchema();
  const [a] = await sql<{ slug: string; name: string }[]>`SELECT slug, name FROM athletes WHERE id = ${athleteId}`;
  if (!a) throw new Error("atleta não existe");
  const s = build(a, provider, models, directive);
  const stored = s.directiveIsDefault ? null : s.directive;
  await sql`
    INSERT INTO ai_settings (athlete_id, provider, models, directive) VALUES (${athleteId}, ${s.provider}, ${sql.json(s.models)}, ${stored})
    ON CONFLICT (athlete_id) DO UPDATE SET provider = EXCLUDED.provider, models = EXCLUDED.models, directive = EXCLUDED.directive, updated_at = now()`;
  return s;
}

/**
 * Bloco gerado a cada chamada com os dados atuais do app (limiares, provas, últimas semanas de corrida, força e plano).
 * Best-effort: se algo falhar, a chamada segue só com o direcionamento.
 */
export async function liveContext(athleteId: string, timezone: string): Promise<string> {
  try {
    const today = localDate(new Date(), timezone);
    const phys = await getPhysiology(athleteId, today);
    if (!phys) return "";
    const from = addDays(weekStart(today), -28);
    const [activities, planned, races, strengthLogs, physHistory, goalRow] = await Promise.all([
      getActivities(athleteId, from, today),
      getPlanned(athleteId, today, addDays(today, 7)),
      getRaces(athleteId, addDays(today, -90), addDays(today, 365)),
      getStrengthLogs(athleteId, from, today),
      sql<{ validFrom: string; lv1: number; lv2: number; hrMax: number | null; vo2max: number | null; source: string }[]>`
        SELECT to_char(valid_from, 'YYYY-MM-DD') AS "validFrom", lv1, lv2, hr_max AS "hrMax", vo2max, source
        FROM athlete_physiology WHERE athlete_id = ${athleteId} AND valid_from <= ${today} ORDER BY valid_from DESC LIMIT 4`,
      sql<{ goal: string | null }[]>`SELECT goal FROM athletes WHERE id = ${athleteId}`,
    ]);
    const lim = `LIMIARES VIGENTES (${phys.validFrom}, ${phys.source}): LV1 ${phys.lv1} bpm, LV2 ${phys.lv2} bpm, forte a partir de ${phys.hardFrom}, dias leves abaixo de ${phys.easyTarget}, longos abaixo de ${phys.longTarget}${phys.hrMax != null ? `, FC máxima ${phys.hrMax}` : ""}${phys.vo2max != null ? `, VO2máx ${phys.vo2max}` : ""}.`;
    return `\n\n${lim}\n${formatEstado({ today, phys, activities, planned, races, strengthLogs, goal: goalRow[0]?.goal ?? null, physHistory: [...physHistory].reverse() })}`;
  } catch (e) {
    console.error("[ia] contexto atual indisponível:", e instanceof Error ? e.message : e);
    return "";
  }
}

/**
 * Ponto único para qualquer análise de IA do app: usa o provedor escolhido, faz failover
 * injeta o direcionamento e grava a chamada em ai_runs (sucesso ou falha). `kind` nomeia a análise ("teste", "relatorio-semanal"...).
 */
export async function askAi(athleteId: string, kind: string, req: AiRequest, timezone = "America/Sao_Paulo"): Promise<AiResult> {
  const s = await getAiSettings(athleteId);
  // O direcionamento (editável) e os limiares vigentes vão antes do pedido específico de cada análise.
  const system = buildSystem(s.directive, await liveContext(athleteId, timezone), req.system);
  req = { ...req, system };
  const input = { system: req.system, text: req.text, maxTokens: req.maxTokens, json: req.json ?? false, directiveIsDefault: s.directiveIsDefault };
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
