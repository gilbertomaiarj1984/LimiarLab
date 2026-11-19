import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContext } from "@/lib/context";
import { getActivities, getPlanned, getStrengthLogs, getWorkout } from "@/lib/repo";
import { inferKinds, isIsoDate, localDate, localTime, longDate, matchPlan, shortDate } from "@/lib/domain";
import { FIGURES } from "@/lib/figures";
import { swapGroups } from "@/lib/equivalencias";
import TabBar from "@/components/TabBar";
import Script from "next/script";
import SyncButton from "@/components/SyncButton";
import { syncStatus } from "@/lib/sync-status";
import { midRest } from "@/lib/relogio";
import { MOTIVOS } from "@/lib/forca";

export const dynamic = "force-dynamic";

// Escala CR-10 de esforço percebido da sessão (Foster et al., 2001), respondida ao fim do treino.
const PSE: [number, string][] = [
  [0, "repouso"], [1, "muito, muito fácil"], [2, "fácil"], [3, "moderado"], [4, "um pouco difícil"], [5, "difícil"],
  [6, ""], [7, "muito difícil"], [8, ""], [9, ""], [10, "máximo"],
];

export default async function Treino({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dia?: string }> }) {
  const { slug } = await params;
  const { dia } = await searchParams;
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) notFound();
  const { athlete, today } = await loadContext();
  const w = await getWorkout(athlete.id, slug);
  if (!w) notFound();
  const sync = await syncStatus(athlete.id, athlete.timezone);
  const day = dia && isIsoDate(dia) ? dia : today;
  const back = day === today ? "/" : `/?dia=${day}`;
  // Confirmação do que foi feito (histórico de força): só para hoje ou dias que já passaram.
  const canConfirm = day <= today;
  const [planned, acts, logs] = canConfirm
    ? await Promise.all([getPlanned(athlete.id, day, day), getActivities(athlete.id, day, day), getStrengthLogs(athlete.id, day, day, slug)])
    : [[], [], []];
  const realizado = matchPlan(planned, inferKinds(acts, planned), today).some((p) => p.workout === slug && p.status === "feito");
  const registro = logs[0] ?? null;
  const confirmadoEm = registro
    ? `Confirmado em ${shortDate(localDate(new Date(registro.confirmado_em), athlete.timezone))} às ${localTime(new Date(registro.confirmado_em), athlete.timezone)}`
    : null;
  const defRest = midRest(w.rest);
  // Trocas de exercício (base de equivalência): por posição do exercício no treino.
  const swaps: Record<number, ReturnType<typeof swapGroups>> = {};
  w.exercises.forEach((_, i) => { const g = swapGroups(slug, i + 1); if (g.length) swaps[i + 1] = g; });
  const facts: [string, string][] = [
    ...(w.duration ? [[w.duration.replace(/\s*min$/, ""), "minutos"] as [string, string]] : []),
    ...(w.rest ? [[w.rest, "descanso"] as [string, string]] : []),
    ...(w.rir ? [[`RIR ${w.rir}`, "longe da falha"] as [string, string]] : []),
  ];

  return (
    <>
      <main className="view wo">
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--line)" /></marker></defs>
        </svg>
        <header>
          <p className="eyebrow"><Link href={back}>‹ {longDate(day)}</Link></p>
          <h1>{w.title}</h1>
          {w.goal && <p className="wo-lead">{w.goal}</p>}
          <SyncButton {...sync} />
          {facts.length > 0 && (
            <div className="wo-facts">{facts.map(([v, k]) => <div key={k} className="wo-fact"><b>{v}</b><span>{k}</span></div>)}</div>
          )}
        </header>

        {(w.warmup || w.load_note) && (
          <div className="wo-note">
            {w.warmup && <p><strong>Aquecimento:</strong> {w.warmup}</p>}
            {w.load_note && <p><strong>Carga:</strong> {w.load_note}</p>}
          </div>
        )}

        <section className="wo-log" data-key={`ll:treino:${slug}:${day}`}>
          <script type="application/json" className="wo-swapdata" dangerouslySetInnerHTML={{ __html: JSON.stringify(swaps).replace(/</g, "\\u003c") }} />
          {w.exercises.map((e, i) => {
            const fig = e.figure ? FIGURES[e.figure] : undefined;
            return (
              <article key={i} className="wo-card" data-ex={i + 1} data-name={e.name} data-rest={e.rest_s ?? defRest}>
                <div className="wo-head">
                  <div className="wo-num">{i + 1}</div>
                  <div className="wo-title">
                    <h2>{e.name}</h2>
                    <div className="wo-chips">
                      <span className="wo-chip wo-sr">{e.sets} × {e.reps}</span>
                      {e.load && <span className="wo-chip k">{e.load}</span>}
                      {e.focus && <span className="wo-chip wo-focus">{e.focus}</span>}
                    </div>
                  </div>
                  {swaps[i + 1] && <button type="button" className="wo-swap" aria-haspopup="dialog">Trocar</button>}
                </div>
                <div className="wo-swapped" hidden></div>
                {fig && <svg className="fig" viewBox={fig.viewBox} role="img" aria-label={fig.label} dangerouslySetInnerHTML={{ __html: fig.body }} />}
                {e.tips?.length ? <ul className="wo-tips">{e.tips.map((t) => <li key={t}>{t}</li>)}</ul> : null}
                {e.alternative && <div className="wo-var"><strong>Variação:</strong> {e.alternative}</div>}
                <SetButtons sets={e.sets} />
              </article>
            );
          })}
          <div className="wo-foot"><button className="wo-btn wo-reset" type="button">Zerar séries marcadas</button></div>
          {canConfirm && (
            <div className="wo-conf" id="confirmar" data-realizado={realizado ? "1" : undefined} data-motivos={JSON.stringify(MOTIVOS)}>
              <script type="application/json" className="wo-confdata" dangerouslySetInnerHTML={{ __html: JSON.stringify(registro).replace(/</g, "\\u003c") }} />
              <h2>{registro ? "Treino confirmado" : realizado ? "Treino realizado: confirme os exercícios" : "Confirmar o que foi feito"}</h2>
              <p className="wo-conf-sub">
                {registro
                  ? `${confirmadoEm}. Se algo mudou, ajuste e confirme de novo.`
                  : realizado
                    ? "O relógio já registrou este treino. Confira se foi feito o que está abaixo, com as trocas, e ajuste as séries do que ficou pela metade ou não foi feito e diga o motivo das trocas."
                    : "Ao terminar, confira os exercícios (com as trocas) e as séries feitas."}
                {" "}Isso vai para o histórico que orienta os próximos treinos.
              </p>
              <ol className="wo-conf-list"></ol>
              <label className="wo-conf-pse">
                <span>Esforço da sessão (PSE, opcional)</span>
                <select defaultValue={registro?.pse ?? ""}>
                  <option value="">Escolha</option>
                  {PSE.map(([v, t]) => <option key={v} value={v}>{t ? `${v} · ${t}` : v}</option>)}
                </select>
              </label>
              <label className="wo-conf-obs"><span>Observação (opcional)</span><textarea maxLength={500} rows={2} placeholder="Ex.: aparelho ocupado, dor no joelho, carga subiu" defaultValue={registro?.obs ?? ""} /></label>
              <div className="wo-conf-act">
                <button type="button" className="wo-btn wo-conf-ok">{registro ? "Confirmar de novo" : "Confirmar treino"}</button>
                <button type="button" className="wo-btn wo-conf-undo" hidden={!registro}>Desfazer confirmação</button>
              </div>
              <p className="wo-conf-msg" role="status" aria-live="polite"></p>
            </div>
          )}
          <div className="wo-rest" hidden aria-live="polite">
            <div><div className="wo-rest-k">Descanso</div><b>0:00</b></div>
            <div className="wo-rest-b"><button type="button" className="wo-plus">+15 s</button><button type="button" className="wo-skip">Pular</button></div>
          </div>
        </section>
        <Script src="/treino-log.js" strategy="afterInteractive" />
        {w.reference && <p className="foot">{w.reference}</p>}
      </main>
      <TabBar current="/plano" />
    </>
  );
}

function SetButtons({ sets }: { sets: number }) {
  return (
    <div className="wo-sets">
      <span>Séries</span>
      {Array.from({ length: sets }, (_, i) => (
        <button key={i} type="button" className="wo-set" data-set={i + 1} aria-pressed="false" aria-label={`Série ${i + 1} feita`}>{i + 1}</button>
      ))}
    </div>
  );
}
