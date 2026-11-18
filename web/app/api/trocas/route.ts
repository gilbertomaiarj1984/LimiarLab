import { NextResponse } from "next/server";
import { loadContext } from "@/lib/context";
import { isIsoDate } from "@/lib/domain";
import { swapGroups } from "@/lib/equivalencias";
import { deleteSwap, getSwaps, setSwap } from "@/lib/repo";

export const dynamic = "force-dynamic";

// Trocas de exercício escolhidas na tela do treino. Ficam no servidor para o relógio (e outros aparelhos)
// verem a mesma troca. Exige a sessão do app (proxy.ts).

const SLUG = /^[a-z0-9-]{2,60}$/;

function erro(msg: string, status = 400) {
  return NextResponse.json({ erro: msg }, { status });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = u.searchParams.get("treino") ?? "";
  const dia = u.searchParams.get("dia") ?? "";
  if (!SLUG.test(slug) || !isIsoDate(dia)) return erro("treino ou dia inválido");
  const { athlete } = await loadContext();
  const rows = await getSwaps(athlete.id, dia, dia, slug);
  const trocas: Record<string, { g: number; id: string }> = {};
  for (const r of rows) trocas[String(r.ex)] = { g: r.g, id: r.id };
  return NextResponse.json({ trocas }, { headers: { "Cache-Control": "no-store" } });
}

async function corpo(req: Request): Promise<{ treino?: unknown; dia?: unknown; ex?: unknown; g?: unknown; id?: unknown } | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : null;
  } catch {
    return null;
  }
}

export async function PUT(req: Request) {
  const b = await corpo(req);
  if (!b) return erro("JSON inválido");
  const { treino, dia, ex, g, id } = b;
  if (typeof treino !== "string" || !SLUG.test(treino) || typeof dia !== "string" || !isIsoDate(dia)) return erro("treino ou dia inválido");
  if (!Number.isInteger(ex) || !Number.isInteger(g) || typeof id !== "string") return erro("troca inválida");
  const grupo = swapGroups(treino, ex as number)[g as number];
  if (!grupo?.alternativas.some((a) => a.id === id)) return erro("troca fora da base de equivalência", 422);
  const { athlete } = await loadContext();
  await setSwap(athlete.id, { date: dia, slug: treino, ex: ex as number, g: g as number, id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const b = await corpo(req);
  if (!b) return erro("JSON inválido");
  const { treino, dia, ex } = b;
  if (typeof treino !== "string" || !SLUG.test(treino) || typeof dia !== "string" || !isIsoDate(dia) || !Number.isInteger(ex)) return erro("troca inválida");
  const { athlete } = await loadContext();
  await deleteSwap(athlete.id, dia, treino, ex as number);
  return NextResponse.json({ ok: true });
}
