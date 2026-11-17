import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Fase 1, sem login de usuários: tudo exige a sessão criada pela senha do app (APP_PASSWORD),
// menos o que precisa funcionar sem ela. /api/import tem o próprio token (IMPORT_TOKEN).
const PUBLIC = ["/entrar", "/api/health", "/api/import", "/manifest.webmanifest", "/sw.js"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? "");
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Arquivos estáticos e ícones ficam de fora (não têm dados).
  matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico).*)"],
};
