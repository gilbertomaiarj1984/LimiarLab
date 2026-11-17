import { NextResponse } from "next/server";
import { getAthlete } from "@/lib/repo";
import { getConnection, stravaConfigured, syncStrava } from "@/lib/sync";

export const dynamic = "force-dynamic";

// Botão "Atualizar": busca no Strava o que foi feito nos últimos dias. Exige a sessão (proxy.ts).
export async function POST() {
  if (!stravaConfigured()) return NextResponse.json({ erro: "Strava não configurado no servidor" }, { status: 503 });
  const athlete = await getAthlete(process.env.DEFAULT_ATHLETE || "giba");
  if (!athlete) return NextResponse.json({ erro: "atleta não existe" }, { status: 404 });
  const c = await getConnection(athlete.id);
  if (!c) return NextResponse.json({ erro: "Strava não conectado", conectar: true }, { status: 409 });
  // Evita rajada de toques: no máximo uma consulta a cada 15 s.
  if (c.lastSyncAt && Date.now() - c.lastSyncAt.getTime() < 15_000) return NextResponse.json({ ok: true, vistas: 0, novas: 0, ignoradas: 0, recente: true });
  try {
    return NextResponse.json({ ok: true, ...(await syncStrava(athlete)) });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha ao atualizar" }, { status: 502 });
  }
}
