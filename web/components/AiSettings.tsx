"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AI_LABELS, AI_MODELS, AI_PROVIDERS, type AiProvider } from "@/lib/ai/providers";
import { MAX_DIRECTIVE_CHARS, estimateTokens } from "@/lib/ai/directive";

type Props = { provider: AiProvider; models: Record<AiProvider, string>; configured: Record<AiProvider, boolean>; directive: string; defaultDirective: string };

/** Escolha do provedor e do modelo de IA, selo de chave por provedor e botão de teste. Nunca mostra chaves. */
export default function AiSettings({ provider: p0, models: m0, configured, directive: d0, defaultDirective }: Props) {
  const router = useRouter();
  const [provider, setProvider] = useState(p0);
  const [models, setModels] = useState(m0);
  const [directive, setDirective] = useState(d0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [preview, setPreview] = useState<{ texto: string; tokens: number } | null>(null);

  async function save() {
    setBusy("save"); setMsg(null);
    try {
      const r = await fetch("/api/ia", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, models, directive }) });
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

  async function showPreview() {
    if (preview) { setPreview(null); return; }
    try {
      const r = await fetch("/api/ia");
      const j = (await r.json().catch(() => ({}))) as { texto?: string; tokens?: number; erro?: string };
      if (r.ok && j.texto) setPreview({ texto: j.texto, tokens: j.tokens ?? 0 }); else setMsg(j.erro ?? "Falha ao montar a prévia");
    } catch { setMsg("Sem conexão. Tente de novo."); }
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
      <div className="conn" style={{ display: "block" }}>
        <h3>Direcionamento</h3>
        <p className="muted small">Contexto de corrida e força enviado em toda chamada de IA, igual para os 3 provedores. Já vem preenchido; edite à vontade. Depois dele o app acrescenta sozinho, a cada chamada, o estado atual (limiares, provas, últimas semanas de corrida, força e plano), então esse texto não precisa de números que mudam.</p>
        <textarea
          value={directive}
          onChange={(e) => setDirective(e.target.value.slice(0, MAX_DIRECTIVE_CHARS))}
          rows={14}
          aria-label="Direcionamento da IA"
          style={{ width: "100%", font: "inherit", fontSize: ".85rem", lineHeight: 1.4, padding: 8, boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <span className="muted small">{directive.length}/{MAX_DIRECTIVE_CHARS} caracteres · ~{estimateTokens(directive)} tokens por chamada (o Groq free aceita 8.000 por minuto)</span>
          <button className="btn" style={{ cursor: "pointer" }} type="button" onClick={() => setDirective(defaultDirective)} disabled={busy !== null || directive === defaultDirective}>Restaurar padrão</button>
        </div>
      </div>
      <div className="conn" style={{ display: "block" }}>
        <button className="btn" style={{ cursor: "pointer" }} type="button" onClick={showPreview}>{preview ? "Esconder o que é enviado" : "Ver o que é enviado"}</button>
        {preview && (
          <>
            <p className="muted small">Texto salvo + estado atual de agora (~{preview.tokens} tokens). Edições ainda não salvas não aparecem aqui.</p>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: ".78rem", maxHeight: 360, overflow: "auto" }}>{preview.texto}</pre>
          </>
        )}
      </div>
      {msg && <div className="muted small" role="status">{msg}</div>}
    </div>
  );
}
