import { NextResponse } from "next/server";
import { loadContext } from "@/lib/context";
import { addDays, isIsoDate } from "@/lib/domain";
import { resumo } from "@/lib/forca";
import { getStrengthLogs } from "@/lib/repo";
import { bearerMatches } from "@/lib/session";

export const dynamic = "force-dynamic";

// Histórico dos treinos de força confirmados, para a rotina do Claude levar em conta ao prescrever.
// Só leitura, com o mesmo token da importação (IMPORT_TOKEN). Padrão: últimas 8 semanas. Máximo: 1 ano.
export async function GET(req: Request) {
  if (!(await bearerMatches(req.headers.get("authorization"), process.env.IMPORT_TOKEN))) {
    return NextResponse.json({ erro: "token inválido" }, { status: 401 });
  }
  const { athlete, today } = await loadContext();
  const u = new URL(req.url);
  const ate = u.searchParams.get("ate") ?? today;
  const de = u.searchParams.get("de") ?? addDays(ate, -55);
  if (!isIsoDate(de) || !isIsoDate(ate) || de > ate) return NextResponse.json({ erro: "período inválido (de/ate em YYYY-MM-DD)" }, { status: 400 });
  if (Date.parse(ate) - Date.parse(de) > 366 * 864e5) return NextResponse.json({ erro: "período máximo de 1 ano" }, { status: 400 });
  const registros = await getStrengthLogs(athlete.id, de, ate);
  return NextResponse.json({ de, ate, registros, resumo: resumo(registros) }, { headers: { "Cache-Control": "no-store" } });
}
