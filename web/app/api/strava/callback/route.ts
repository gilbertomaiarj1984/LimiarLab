import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/app-url";
import { getAthlete } from "@/lib/repo";
import { HISTORY_DAYS, saveConnectionFromCode, syncStrava } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const back = (r: string) => {
    const res = NextResponse.redirect(appUrl(`/?strava=${r}`));
    res.cookies.delete({ name: "ll_strava_state", path: "/api/strava" });
    return res;
  };
  const state = req.cookies.get("ll_strava_state")?.value;
  const code = q.get("code");
  if (q.get("error") || !code) return back("negado");
  if (!state || state !== q.get("state")) return back("estado");
  if (!(q.get("scope") ?? "").split(",").includes("activity:read_all")) return back("escopo");
  const athlete = await getAthlete(process.env.DEFAULT_ATHLETE || "giba");
  if (!athlete) return back("erro");
  try {
    await saveConnectionFromCode(athlete.id, code);
    await syncStrava(athlete, HISTORY_DAYS).catch(() => undefined);
  } catch {
    return back("erro");
  }
  return back("ok");
}
