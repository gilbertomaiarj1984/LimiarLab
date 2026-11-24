// Chamada de IA com failover entre provedores. Só roda no servidor (lê as chaves de process.env).
// Os três adaptadores usam fetch puro, sem SDK. Portado do app Leilão Finder Buddy (ai-provider.server.ts).
import { AI_KEY_ENV, AI_LABELS, AI_PROVIDERS, normalizeModel, type AiProvider } from "./providers.ts";

export type AiRequest = {
  system: string;
  text: string;
  maxTokens: number;
  /** Pede saída JSON (modo JSON do Gemini e do Groq). */
  json?: boolean;
};

export type AiResult = {
  text: string;
  provider: AiProvider;
  model: string;
  /** true quando o provedor pedido falhou e outro atendeu. */
  switched: boolean;
  /** Motivo de cada provedor que falhou ou foi pulado antes do que atendeu. */
  attemptErrors: Partial<Record<AiProvider, string>>;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
};

type Raw = { text: string; inputTokens: number | null; outputTokens: number | null };
type HttpError = Error & { status?: number };

const TIMEOUT_MS = 60_000;

export function providerConfigured(p: AiProvider): boolean {
  return Boolean(process.env[AI_KEY_ENV[p]]);
}

/** Quota esgotada ou sem créditos: vale tentar outro provedor. */
export function isQuotaError(e: unknown): boolean {
  const x = e as { status?: number; message?: string } | null;
  // 413 = pedido grande demais para o limite de tokens por minuto (Groq free): outro provedor aguenta.
  if (x?.status === 429 || x?.status === 402 || x?.status === 413) return true;
  const m = String(x?.message ?? e ?? "").toLowerCase();
  return ["credit balance", "insufficient", "quota", "exhausted", "billing", "too low"].some((k) => m.includes(k));
}

/** Indisponibilidade momentânea (5xx, sobrecarga, timeout): vale tentar de novo ou em outro provedor. */
export function isTransientError(e: unknown): boolean {
  const x = e as { status?: number; message?: string } | null;
  if (x?.status && [500, 502, 503, 504, 529].includes(x.status)) return true;
  const m = String(x?.message ?? e ?? "").toLowerCase();
  return ["unavailable", "overloaded", "high demand", "try again", "timeout", "timed out", "aborted"].some((k) => m.includes(k));
}

async function post(name: string, url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  // Até 3 tentativas para erro transitório (espera de 0,8 s e 1,6 s). 429 não repete: vai direto ao failover.
  for (let attempt = 0; ; attempt += 1) {
    let resp: Response;
    try {
      resp = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      const err = new Error(`${name}: ${(e as Error).message}`) as HttpError;
      if (attempt >= 2 || !isTransientError(err)) throw err;
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      continue;
    }
    if (resp.ok) return resp.json();
    const detail = (await resp.text().catch(() => "")).slice(0, 300);
    const err = new Error(`${name} HTTP ${resp.status}: ${detail}`) as HttpError;
    err.status = resp.status;
    if (attempt >= 2 || !isTransientError(err)) throw err;
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
  }
}

async function runAnthropic(req: AiRequest, model: string): Promise<Raw> {
  const d = (await post("Claude", "https://api.anthropic.com/v1/messages", { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" }, {
    model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: [{ role: "user", content: [{ type: "text", text: req.text }] }],
    // O Haiku 5.5 pensa por padrão e cobra isso como saída; aqui não precisa.
    ...(model.startsWith("claude-haiku-5") ? { thinking: { type: "disabled" } } : {}),
  })) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
  const text = (d.content ?? []).filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text).join("");
  if (!text.trim()) throw new Error("Claude não retornou texto");
  return { text, inputTokens: d.usage?.input_tokens ?? null, outputTokens: d.usage?.output_tokens ?? null };
}

async function runGemini(req: AiRequest, model: string): Promise<Raw> {
  const d = (await post("Gemini", `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": process.env.GEMINI_API_KEY! }, {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts: [{ text: req.text }] }],
    generationConfig: {
      // Folga: o Gemini às vezes gasta o teto "pensando" e devolve resposta vazia.
      maxOutputTokens: Math.max(req.maxTokens + 4096, 8192),
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
      ...(req.json ? { responseMimeType: "application/json" } : {}),
    },
  })) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string }; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
  const c = d.candidates?.[0];
  const text = (c?.content?.parts ?? []).map((p) => (typeof p.text === "string" ? p.text : "")).join("");
  if (!text.trim()) {
    const why = d.promptFeedback?.blockReason ? `blockReason=${d.promptFeedback.blockReason}` : `finishReason=${c?.finishReason ?? "desconhecido"}`;
    throw new Error(`Gemini não retornou texto (${why})`);
  }
  return { text, inputTokens: d.usageMetadata?.promptTokenCount ?? null, outputTokens: d.usageMetadata?.candidatesTokenCount ?? null };
}

async function runGroq(req: AiRequest, model: string): Promise<Raw> {
  const d = (await post("Groq", "https://api.groq.com/openai/v1/chat/completions", { authorization: `Bearer ${process.env.GROQ_API_KEY}` }, {
    model,
    messages: [{ role: "system", content: req.system }, { role: "user", content: req.text }],
    // O gpt-oss gasta o teto raciocinando; sem folga o texto vem vazio.
    max_tokens: req.maxTokens + (model.startsWith("openai/gpt-oss") ? 2048 : 0),
    temperature: 0.2,
    ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
    ...(req.json ? { response_format: { type: "json_object" } } : {}),
  })) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const ch = d.choices?.[0];
  const text = ch?.message?.content ?? "";
  if (!text.trim()) throw new Error(`Groq não retornou texto (finishReason=${ch?.finish_reason ?? "desconhecido"})`);
  return { text, inputTokens: d.usage?.prompt_tokens ?? null, outputTokens: d.usage?.completion_tokens ?? null };
}

const RUNNERS: Record<AiProvider, (req: AiRequest, model: string) => Promise<Raw>> = { anthropic: runAnthropic, gemini: runGemini, groq: runGroq };

/**
 * Gera texto no provedor pedido. Se ele estiver sem chave, sem quota ou indisponível, tenta os outros
 * configurados na ordem canônica. Outros erros (400, 401, 403, resposta vazia) sobem sem failover.
 * `models` traz o modelo escolhido por provedor; id desconhecido cai no padrão.
 */
export async function runText(req: AiRequest, provider: AiProvider, models: Partial<Record<AiProvider, string>> = {}): Promise<AiResult> {
  const order = [provider, ...AI_PROVIDERS.filter((p) => p !== provider)];
  const attemptErrors: Partial<Record<AiProvider, string>> = {};
  for (const p of order) {
    if (!providerConfigured(p)) { attemptErrors[p] = "sem chave configurada"; continue; }
    const model = normalizeModel(p, models[p]);
    const t0 = Date.now();
    try {
      const raw = await RUNNERS[p](req, model);
      return { ...raw, provider: p, model, switched: p !== provider, attemptErrors, latencyMs: Date.now() - t0 };
    } catch (e) {
      if (!isQuotaError(e) && !isTransientError(e)) throw e;
      attemptErrors[p] = isQuotaError(e) ? "sem créditos ou quota" : "indisponível no momento";
    }
  }
  const trail = order.map((p) => `${AI_LABELS[p]}: ${attemptErrors[p] ?? "erro"}`).join(" · ");
  throw new Error(`Nenhum provedor de IA atendeu — ${trail}`);
}
