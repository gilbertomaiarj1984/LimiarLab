import test from "node:test";
import assert from "node:assert/strict";
import { isQuotaError, isTransientError, runText } from "./run.ts";
import { normalizeModel, defaultModel, isAiProvider } from "./providers.ts";

const KEYS = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY"] as const;
const realFetch = globalThis.fetch;
function setup(keys: string[], handler: (url: string) => Response) {
  for (const k of KEYS) delete process.env[k];
  for (const k of keys) process.env[k] = "x";
  globalThis.fetch = (async (url: string) => handler(String(url))) as typeof fetch;
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
const req = { system: "s", text: "t", maxTokens: 50 };
test.afterEach(() => { globalThis.fetch = realFetch; });

test("modelo desconhecido cai no padrão; provedor inválido é recusado", () => {
  assert.equal(normalizeModel("gemini", "gemini-inventado"), defaultModel("gemini"));
  assert.equal(normalizeModel("groq", "openai/gpt-oss-120b"), "openai/gpt-oss-120b");
  assert.equal(isAiProvider("grok"), false);
  assert.equal(isAiProvider("groq"), true);
});
test("classifica quota e erro transitório", () => {
  assert.ok(isQuotaError({ status: 429 }));
  assert.ok(isTransientError({ status: 503 }));
  assert.ok(!isQuotaError({ status: 400, message: "bad request" }));
  assert.ok(!isTransientError({ status: 401 }));
});
test("Claude atende e devolve tokens", async () => {
  setup(["ANTHROPIC_API_KEY"], () => json({ content: [{ type: "text", text: "oi" }], usage: { input_tokens: 5, output_tokens: 2 } }));
  const r = await runText(req, "anthropic");
  assert.equal(r.text, "oi"); assert.equal(r.provider, "anthropic"); assert.equal(r.switched, false);
  assert.equal(r.inputTokens, 5); assert.equal(r.outputTokens, 2);
});
test("pedido sem chave troca para o provedor configurado", async () => {
  setup(["GROQ_API_KEY"], () => json({ choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 3, completion_tokens: 1 } }));
  const r = await runText(req, "gemini");
  assert.equal(r.provider, "groq"); assert.equal(r.switched, true);
  assert.equal(r.attemptErrors.gemini, "sem chave configurada");
});
test("quota (429) no Claude cai para o Gemini", async () => {
  setup(["ANTHROPIC_API_KEY", "GEMINI_API_KEY"], (u) => u.includes("anthropic") ? json({ error: "quota" }, 429) : json({ candidates: [{ content: { parts: [{ text: "g" }] } }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 1 } }));
  const r = await runText(req, "anthropic");
  assert.equal(r.provider, "gemini"); assert.equal(r.text, "g"); assert.equal(r.attemptErrors.anthropic, "sem créditos ou quota");
});
test("erro 400 não faz failover", async () => {
  setup(["ANTHROPIC_API_KEY", "GEMINI_API_KEY"], () => json({ error: "bad" }, 400));
  await assert.rejects(runText(req, "anthropic"), /HTTP 400/);
});
test("sem nenhuma chave dá erro claro", async () => {
  setup([], () => json({}));
  await assert.rejects(runText(req, "anthropic"), /Nenhum provedor/);
});
test("Gemini vazio vira erro, não texto em branco", async () => {
  setup(["GEMINI_API_KEY"], () => json({ candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }] }));
  await assert.rejects(runText(req, "gemini"), /MAX_TOKENS/);
});
