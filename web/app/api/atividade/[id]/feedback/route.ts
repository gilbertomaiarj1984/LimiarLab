import { NextResponse } from "next/server";
import { loadContext } from "@/lib/context";
import { FeedbackError, generateRunFeedback } from "@/lib/ai/feedback-store";

export const dynamic = "force-dynamic";
// A IA pode demorar (retries e failover entre provedores): dá folga ao servidor.
export const maxDuration = 120;

// Gera (ou gera de novo) o feedback de IA de uma corrida já realizada. Exige a sessão (proxy.ts).
// O atleta vem do contexto do app e a corrida é buscada por athlete_id + id: nunca cruza atletas.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { athlete } = await loadContext();
  try {
    const f = await generateRunFeedback(athlete, id);
    return NextResponse.json({ ok: true, feedback: f });
  } catch (e) {
    if (e instanceof FeedbackError) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha ao gerar o feedback" }, { status: 502 });
  }
}
