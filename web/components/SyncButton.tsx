"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type State = { kind: "idle" | "busy" | "ok" | "err"; text?: string; connect?: boolean };

/** Busca no Strava (espelho do Garmin) o que foi realizado e recarrega a tela. */
export default function SyncButton({ connected, configured, lastSync }: { connected: boolean; configured: boolean; lastSync: string | null }) {
  const router = useRouter();
  const [st, setSt] = useState<State>({ kind: "idle" });
  if (!configured) return null;
  if (!connected) {
    return <a className="wo-btn sync-btn" href="/api/strava/connect">Conectar Strava para atualizar</a>;
  }
  async function run() {
    setSt({ kind: "busy" });
    try {
      const r = await fetch("/api/sync", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { erro?: string; novas?: number; conectar?: boolean };
      if (!r.ok) { setSt({ kind: "err", text: j.erro ?? "Falha ao atualizar", connect: j.conectar }); return; }
      setSt({ kind: "ok", text: j.novas ? `${j.novas} nova${j.novas > 1 ? "s" : ""} atividade${j.novas > 1 ? "s" : ""}` : "Nada novo" });
      router.refresh();
    } catch {
      setSt({ kind: "err", text: "Sem conexão. Tente de novo." });
    }
  }
  return (
    <div className="sync">
      <button type="button" className="wo-btn sync-btn" onClick={run} disabled={st.kind === "busy"}>
        {st.kind === "busy" ? "Atualizando…" : "Atualizar"}
      </button>
      <span className="sync-msg" role="status">
        {st.text ?? (lastSync ? `Atualizado ${lastSync}. Também às 9h todo dia.` : "Também às 9h todo dia.")}
        {st.connect && <> <a href="/api/strava/connect">Conectar</a></>}
      </span>
    </div>
  );
}
