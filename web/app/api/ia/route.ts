import { NextResponse } from "next/server";
import { getAthlete } from "@/lib/repo";
import { askAi, getAiSettings, saveAiSettings, configuredMap } from "@/lib/ai/store";
import { AI_LABELS, isAiProvider } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

async function athleteOr404() {
  return getAthlete(process.env.DEFAULT_ATHLETE || "giba");
}

// Salva o provedor e o modelo escolhidos. Exige a sessão (proxy.ts). As chaves nunca passam por aqui.
export async function PUT(req: Request) {
  const athlete = await athleteOr404();
  if (!athlete) return NextResponse.json({ erro: "atleta não existe" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { provider?: unknown; models?: unknown } | null;
  if (!body || !isAiProvider(body.provider)) return NextResponse.json({ erro: "provedor inválido" }, { status: 400 });
  const prev = await getAiSettings(athlete.id);
  const incoming = body.models && typeof body.models === "object" ? (body.models as Record<string, unknown>) : {};
  const s = await saveAiSettings(athlete.id, body.provider, { ...prev.models, ...incoming });
  return NextResponse.json({ ok: true, ...s, configurados: configuredMap() });
}

// Teste: uma pergunta curta ao provedor escolhido (com failover). Grava em ai_runs como "teste".
export async function POST() {
  const athlete = await athleteOr404();
  if (!athlete) return NextResponse.json({ erro: "atleta não existe" }, { status: 404 });
  try {
    const r = await askAi(athlete.id, "teste", { system: "Responda em português, em uma frase curta.", text: "Diga que a IA do LimiarLab está funcionando.", maxTokens: 60 });
    return NextResponse.json({
      ok: true, texto: r.text.trim(), provedor: AI_LABELS[r.provider], modelo: r.model, trocou: r.switched,
      tentativas: r.attemptErrors, ms: r.latencyMs, tokens: { entrada: r.inputTokens, saida: r.outputTokens },
    });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha ao consultar a IA" }, { status: 502 });
  }
}
