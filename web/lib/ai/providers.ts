// Metadados dos provedores de IA. Sem chaves, sem rede: pode ser importado por componentes do cliente.
// Portado do app Leilão Finder Buddy (ai-provider.ts), só com ids de modelo já testados lá.

export type AiProvider = "anthropic" | "gemini" | "groq";

/** Ordem de tentativa no failover. */
export const AI_PROVIDERS: readonly AiProvider[] = ["anthropic", "gemini", "groq"];

export const AI_LABELS: Record<AiProvider, string> = {
  anthropic: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  groq: "Groq (free tier)",
};

/** Variável de ambiente que guarda a chave de cada provedor. Só existe no servidor (.env.production). */
export const AI_KEY_ENV: Record<AiProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

export type AiModelOption = { id: string; label: string };

/** Só ids confirmados em produção. Um id inventado volta 400 e não faz failover: não acrescente sem testar na API. */
export const AI_MODELS: Record<AiProvider, readonly AiModelOption[]> = {
  anthropic: [{ id: "claude-haiku-5-5", label: "Haiku 5.5 · $0,10/$0,50 por 1M tokens" }],
  gemini: [{ id: "gemini-3.1-flash-lite", label: "Flash-Lite 3.1 · $0,25/$1,50 por 1M tokens" }],
  groq: [{ id: "openai/gpt-oss-120b", label: "gpt-oss 120B · grátis (limites por minuto e dia)" }],
};

export function isAiProvider(v: unknown): v is AiProvider {
  return typeof v === "string" && (AI_PROVIDERS as readonly string[]).includes(v);
}

export function defaultModel(p: AiProvider): string {
  return AI_MODELS[p][0].id;
}

/** Modelo válido para o provedor; valor desconhecido cai no padrão. */
export function normalizeModel(p: AiProvider, model: unknown): string {
  return AI_MODELS[p].some((m) => m.id === model) ? (model as string) : defaultModel(p);
}
