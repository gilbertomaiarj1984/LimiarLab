import { NextResponse } from "next/server";
import { importSchema } from "@/lib/import-schema";
import { applyImport, getAthlete } from "@/lib/repo";
import { bearerMatches } from "@/lib/session";

// Recebe treinos planejados e realizados (rotina do Claude). Contrato em docs/importacao.md.
export async function POST(req: Request) {
  if (!(await bearerMatches(req.headers.get("authorization"), process.env.IMPORT_TOKEN))) {
    return NextResponse.json({ erro: "token inválido" }, { status: 401 });
  }
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 2_000_000) return NextResponse.json({ erro: "lote grande demais (máx. 2 MB)" }, { status: 413 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "lote recusado; nada foi gravado", detalhes: parsed.error.issues.slice(0, 20).map((i) => ({ caminho: i.path.join("."), msg: i.message })) },
      { status: 422 },
    );
  }
  const athlete = await getAthlete(parsed.data.athlete);
  if (!athlete) return NextResponse.json({ erro: `atleta "${parsed.data.athlete}" não existe` }, { status: 404 });
  const result = await applyImport(athlete, parsed.data);
  return NextResponse.json({ ok: true, ...result });
}
