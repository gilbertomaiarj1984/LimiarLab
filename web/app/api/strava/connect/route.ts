import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { authorizeUrl } from "@/lib/strava";
import { stravaConfigured } from "@/lib/sync";

export const dynamic = "force-dynamic";

// Inicia a conexão com o Strava (precisa da sessão do app; o proxy.ts já exige).
export async function GET() {
  if (!stravaConfigured() || !process.env.APP_URL) {
    return NextResponse.json({ erro: "Strava não configurado no servidor (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, APP_URL)" }, { status: 503 });
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(process.env.STRAVA_CLIENT_ID!, appUrl("/api/strava/callback"), state));
  res.cookies.set("ll_strava_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/strava", maxAge: 600 });
  return res;
}
