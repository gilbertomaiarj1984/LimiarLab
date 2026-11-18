import { NextResponse } from "next/server";
import { loadContext } from "@/lib/context";
import { addDays, localTime } from "@/lib/domain";
import { buildWatchPlan, WATCH_DAYS } from "@/lib/relogio";
import { getPlanned, getSwaps, getWorkouts } from "@/lib/repo";
import { bearerMatches } from "@/lib/session";

export const dynamic = "force-dynamic";

// App do relógio (garmin/): treinos de força de hoje até 6 dias depois, com as trocas do dia aplicadas.
// Só leitura. Token próprio (RELOGIO_TOKEN), separado do IMPORT_TOKEN, que grava.
export async function GET(req: Request) {
  if (!(await bearerMatches(req.headers.get("authorization"), process.env.RELOGIO_TOKEN))) {
    return NextResponse.json({ erro: "token inválido" }, { status: 401 });
  }
  const { athlete, today } = await loadContext();
  const last = addDays(today, WATCH_DAYS - 1);
  const planned = await getPlanned(athlete.id, today, last);
  const slugs = [...new Set(planned.map((p) => p.workout).filter((s): s is string => !!s))];
  const [workouts, swaps] = await Promise.all([getWorkouts(athlete.id, slugs), getSwaps(athlete.id, today, last)]);
  const plan = buildWatchPlan(today, planned, workouts, swaps);
  return NextResponse.json({ ...plan, atualizado: localTime(new Date(), athlete.timezone) }, { headers: { "Cache-Control": "no-store" } });
}
