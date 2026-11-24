"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AI_LABELS, AI_MODELS, AI_PROVIDERS, type AiProvider } from "@/lib/ai/providers";

type Props = { provider: AiProvider; models: Record<AiProvider, string>; configured: Record<AiProvider, boolean> };

/** Escolha do provedor e do modelo de IA, selo de chave por provedor e botão de teste. Nunca mostra chaves. */
export default function AiSettings({ provider: p0, models: m0, configured }: Props) {
  const router = useRouter();
  const [provider, setProvider] = useState(p0);
  const [models, setModels] = useState(m0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  async function save() {
    setBusy("save"); setMsg(null);
    try {
      const r = await fetch("/api/ia", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, models }) });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      setMsg(r.ok ? "Salvo." : (j.erro ?? "Falha ao salvar"));
      if (r.ok) router.refresh();
    } catch { setMsg("Sem conexão. Tente de novo."); }
    setBusy(null);
  }
  async function test() {
    setBusy("test"); setMsg(null);
    try {
      const r = await fetch("/api/ia", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { erro?: string; texto?: string; provedor?: string; modelo?: string; trocou?: boolean; ms?: number };
      setMsg(r.ok ? `${j.provedor} · ${j.modelo}${j.trocou ? " (trocou de provedor)" : ""} · ${j.ms} ms — “${j.texto}”` : (j.erro ?? "Falha ao testar"));
      if (r.ok) router.refresh();
    } catch { setMsg("Sem conexão. Tente de novo."); }
    setBusy(null);
  }

  return (
    <div className="box">
      {AI_PROVIDERS.map((p) => (
        <div key={p} className="conn">
          <label style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
            <input type="radio" name="ia-provedor" checked={provider === p} onChange={() => setProvider(p)} />
            <span>
              <h3>{AI_LABELS[p]}</h3>
              {AI_MODELS[p].length > 1 ? (
                <select value={models[p]} onChange={(e) => setModels({ ...models, [p]: e.target.value })} aria-label={`Modelo ${AI_LABELS[p]}`}>
                  {AI_MODELS[p].map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              ) : <p className="muted small">{AI_MODELS[p][0].label}</p>}
            </span>
          </label>
          <span className={`st ${configured[p] ? "ok" : "wait"}`}>{configured[p] ? "chave ok" : "sem chave"}</span>
        </div>
      ))}
      <div className="conn">
        <p className="muted small">Se o provedor escolhido ficar sem cota ou fora do ar, o app tenta os outros com chave.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ cursor: "pointer" }} type="button" onClick={test} disabled={busy !== null}>{busy === "test" ? "Testando…" : "Testar"}</button>
          <button className="btn" style={{ cursor: "pointer" }} type="button" onClick={save} disabled={busy !== null}>{busy === "save" ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
      {msg && <div className="muted small" role="status">{msg}</div>}
    </div>
  );
}
