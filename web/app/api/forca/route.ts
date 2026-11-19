import { NextResponse } from "next/server";
import { loadContext } from "@/lib/context";
import { isIsoDate } from "@/lib/domain";
import { ConfirmacaoInvalida, isMotivo, montarItens, type Confirmacao } from "@/lib/forca";
import { deleteStrengthLog, getStrengthLogs, getWorkout, saveStrengthLog } from "@/lib/repo";

export const dynamic = "force-dynamic";

// Confirmação do treino de força realizado (tela do treino). Exige a sessão do app (proxy.ts).
// O histórico fica em strength_logs; a rotina que prescreve lê em /api/forca/historico.

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
  const [registro] = await getStrengthLogs(athlete.id, dia, dia, slug);
  return NextResponse.json({ registro: registro ?? null }, { headers: { "Cache-Control": "no-store" } });
}

async function corpo(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? b : null;
  } catch {
    return null;
  }
}

function lerItens(v: unknown): Confirmacao[] | null {
  if (!Array.isArray(v) || v.length > 15) return null;
  const out: Confirmacao[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") return null;
    const { ex, series, troca, motivo } = x as Record<string, unknown>;
    if (motivo != null && !isMotivo(motivo)) return null;
    if (!Number.isInteger(ex) || !Number.isInteger(series)) return null;
    let t: Confirmacao["troca"] = null;
    if (troca != null) {
      const { g, id } = troca as Record<string, unknown>;
      if (!Number.isInteger(g) || typeof id !== "string") return null;
      t = { g: g as number, id };
    }
    out.push({ ex: ex as number, series: series as number, troca: t, motivo: motivo ?? null });
  }
  return out;
}

export async function PUT(req: Request) {
  const b = await corpo(req);
  if (!b) return erro("JSON inválido");
  const { treino, dia, itens, obs, pse } = b;
  if (typeof treino !== "string" || !SLUG.test(treino) || typeof dia !== "string" || !isIsoDate(dia)) return erro("treino ou dia inválido");
  const conf = lerItens(itens);
  if (!conf) return erro("itens inválidos");
  if (obs != null && (typeof obs !== "string" || obs.length > 500)) return erro("observação inválida (até 500 caracteres)");
  if (pse != null && (!Number.isInteger(pse) || (pse as number) < 0 || (pse as number) > 10)) return erro("PSE inválida (0 a 10)");
  const { athlete, today } = await loadContext();
  if (dia > today) return erro("não dá para confirmar um treino de um dia que ainda não chegou", 422);
  const w = await getWorkout(athlete.id, treino);
  if (!w) return erro("treino não existe", 404);
  let montados;
  try {
    montados = montarItens(treino, w, conf);
  } catch (e) {
    if (e instanceof ConfirmacaoInvalida) return erro(e.message, 422);
    throw e;
  }
  const swaps = conf.filter((c) => c.troca).map((c) => ({ ex: c.ex, g: c.troca!.g, id: c.troca!.id }));
  const nota = typeof obs === "string" && obs.trim() ? obs.trim() : null;
  const registro = await saveStrengthLog(athlete.id, dia, treino, w.title, montados, swaps, nota, (pse as number | null | undefined) ?? null);
  return NextResponse.json({ registro });
}

export async function DELETE(req: Request) {
  const b = await corpo(req);
  if (!b) return erro("JSON inválido");
  const { treino, dia } = b;
  if (typeof treino !== "string" || !SLUG.test(treino) || typeof dia !== "string" || !isIsoDate(dia)) return erro("treino ou dia inválido");
  const { athlete } = await loadContext();
  await deleteStrengthLog(athlete.id, dia, treino);
  return NextResponse.json({ ok: true });
}
