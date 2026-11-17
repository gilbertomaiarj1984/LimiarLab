"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Carrega os últimos 2 anos do Strava (só o que ainda não existe no app). */
export default function HistoryButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/sync?historico=1", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { erro?: string; novas?: number; vistas?: number };
      setMsg(r.ok ? `${j.novas ?? 0} novas de ${j.vistas ?? 0} no Strava` : (j.erro ?? "Falha ao carregar"));
      if (r.ok) router.refresh();
    } catch { setMsg("Sem conexão. Tente de novo."); }
    setBusy(false);
  }
  return <div style={{ textAlign: "right" }}><button className="btn" type="button" onClick={run} disabled={busy}>{busy ? "Carregando…" : "Carregar"}</button>{msg && <div className="muted small" role="status">{msg}</div>}</div>;
}
