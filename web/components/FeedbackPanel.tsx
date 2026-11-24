"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type FeedbackView = {
  createdAt: string;
  provider: string;
  model: string;
  rawText: string;
  structured: {
    resumo: string; veredito: string | null; intensidade: string | null;
    pontosPositivos: string[]; pontosAtencao: string[]; proximoPasso: string | null; levarAoTreinador: string | null;
  } | null;
};

const VEREDITO: Record<string, string> = { dentro_do_plano: "Dentro do plano", parcial: "Parcialmente no plano", fora_do_plano: "Fora do plano", sem_plano: "Sem treino prescrito" };
const INTENSIDADE: Record<string, string> = { adequada: "Intensidade adequada", acima_do_alvo: "Intensidade acima do alvo", abaixo_do_alvo: "Intensidade abaixo do alvo", indeterminada: "Intensidade indeterminada" };

/** Botão Feedback da corrida + o último feedback gravado. O botão só existe na tela de uma corrida realizada. */
export default function FeedbackPanel({ activityId, initial, whenLabel }: { activityId: string; initial: FeedbackView | null; whenLabel: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/atividade/${activityId}/feedback`, { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (r.ok) router.refresh(); else setErr(j.erro ?? "Não consegui gerar o feedback.");
    } catch { setErr("Sem conexão. Tente de novo."); }
    setBusy(false);
  }

  const s = initial?.structured;
  return (
    <section id="feedback">
      <div className="sec-head"><h2>Feedback da IA</h2><span>{initial ? `${initial.provider} · ${whenLabel ?? ""}` : ""}</span></div>
      <div className="panel">
        {!initial && !busy && <p className="muted">Análise desta corrida em relação ao prescrito, à intensidade e às corridas parecidas.</p>}
        {s ? (
          <>
            <div className="chips">
              {s.veredito && <span className={`chip ${s.veredito === "dentro_do_plano" ? "easy" : s.veredito === "fora_do_plano" ? "hard" : "mod"}`}>{VEREDITO[s.veredito]}</span>}
              {s.intensidade && <span className={`chip ${s.intensidade === "adequada" ? "easy" : s.intensidade === "indeterminada" ? "" : "mod"}`}>{INTENSIDADE[s.intensidade]}</span>}
            </div>
            <p>{s.resumo}</p>
            {s.pontosPositivos.length > 0 && <div><strong>Foi bem</strong><ul>{s.pontosPositivos.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
            {s.pontosAtencao.length > 0 && <div><strong>Atenção</strong><ul>{s.pontosAtencao.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
            {s.proximoPasso && <p><strong>Próximo passo:</strong> {s.proximoPasso}</p>}
            {s.levarAoTreinador && <div className="note">Para levar ao treinador: {s.levarAoTreinador}</div>}
          </>
        ) : initial ? (
          <p style={{ whiteSpace: "pre-wrap" }}>{initial.rawText}</p>
        ) : null}
        <button className="fb-btn" type="button" onClick={run} disabled={busy}>
          {busy ? "Analisando… (pode levar até 1 min)" : initial ? "Gerar de novo" : "Feedback"}
        </button>
        {err && <div className="note warn" role="alert">{err}</div>}
        {initial && <p className="foot">Análise automática por IA ({initial.model}); não substitui o treinador nem avaliação profissional. Fica gravada no histórico.</p>}
      </div>
    </section>
  );
}
