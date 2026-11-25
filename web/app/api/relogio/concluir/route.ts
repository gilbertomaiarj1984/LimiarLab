import { NextResponse } from "next/server";
import { loadContext } from "@/lib/context";
import { isIsoDate } from "@/lib/domain";
import { ConfirmacaoInvalida, montarItens } from "@/lib/forca";
import { confirmacaoDoRelogio } from "@/lib/relogio";
import { getStrengthLogs, getSwaps, getWorkout, saveStrengthLog } from "@/lib/repo";
import { bearerMatches } from "@/lib/session";

export const dynamic = "force-dynamic";

// O relógio (garmin/) avisa que o treino acabou: séries feitas de cada exercício, na ordem do treino.
// Vira a confirmação do treino (strength_logs), como se fosse confirmado na tela do treino, com as trocas do dia.
// Token do relógio (RELOGIO_TOKEN). Só grava a confirmação de força; observação e PSE já informadas são mantidas.

const SLUG = /^[a-z0-9-]{2,60}$/;

function erro(msg: string, status = 400) {
  return NextResponse.json({ erro: msg }, { status });
}

export async function POST(req: Request) {
  if (!(await bearerMatches(req.headers.get("authorization"), process.env.RELOGIO_TOKEN))) return erro("token inválido", 401);
  let b: Record<string, unknown> | null = null;
  try {
    const j = await req.json();
    b = j && typeof j === "object" && !Array.isArray(j) ? j : null;
  } catch {
    b = null;
  }
  if (!b) return erro("JSON inválido");
  const { treino, dia, series } = b;
  if (typeof treino !== "string" || !SLUG.test(treino) || typeof dia !== "string" || !isIsoDate(dia)) return erro("treino ou dia inválido");
  const { athlete, today } = await loadContext();
  if (dia > today) return erro("não dá para confirmar um treino de um dia que ainda não chegou", 422);
  const w = await getWorkout(athlete.id, treino);
  if (!w) return erro("treino não existe", 404);
  const swaps = await getSwaps(athlete.id, dia, dia, treino);
  const conf = confirmacaoDoRelogio(w.exercises.length, series, swaps);
  if (!conf) return erro("séries inválidas");
  let itens;
  try {
    itens = montarItens(treino, w, conf);
  } catch (e) {
    if (e instanceof ConfirmacaoInvalida) return erro(e.message, 422);
    throw e;
  }
  const [anterior] = await getStrengthLogs(athlete.id, dia, dia, treino);
  const registro = await saveStrengthLog(
    athlete.id, dia, treino, w.title, itens, swaps.map((s) => ({ ex: s.ex, g: s.g, id: s.id })), anterior?.obs ?? null, anterior?.pse ?? null,
  );
  return NextResponse.json({ ok: true, feitos: registro.itens.filter((i) => i.situacao !== "nao_feito").length, total: registro.itens.length });
}
