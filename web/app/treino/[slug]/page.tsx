import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContext } from "@/lib/context";
import { getWorkout } from "@/lib/repo";
import { isIsoDate, longDate } from "@/lib/domain";
import { FIGURES } from "@/lib/figures";
import TabBar from "@/components/TabBar";
import Script from "next/script";

export const dynamic = "force-dynamic";

/** Primeiro número de uma faixa como "60–90 s" (para o contador de descanso). */
function midRest(rest: string | null | undefined): number {
  const n = (rest ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (!n.length) return 75;
  return n.length > 1 ? Math.round((n[0] + n[1]) / 2 / 15) * 15 : n[0];
}

export default async function Treino({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dia?: string }> }) {
  const { slug } = await params;
  const { dia } = await searchParams;
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) notFound();
  const { athlete, today } = await loadContext();
  const w = await getWorkout(athlete.id, slug);
  if (!w) notFound();
  const day = dia && isIsoDate(dia) ? dia : today;
  const back = day === today ? "/" : `/?dia=${day}`;
  const defRest = midRest(w.rest);
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

        <section className="wo-log" data-key={`ll:treino:${slug}:${day}`} data-day={day} data-daylabel={longDate(day)} data-title={w.title}>
          {w.exercises.map((e, i) => {
            const fig = e.figure ? FIGURES[e.figure] : undefined;
            return (
              <article key={i} className="wo-card" data-ex={i + 1} data-name={e.name} data-rest={e.rest_s ?? defRest}>
                <div className="wo-head">
                  <div className="wo-num">{i + 1}</div>
                  <div>
                    <h2>{e.name}</h2>
                    <div className="wo-chips">
                      <span className="wo-chip">{e.sets} × {e.reps}</span>
                      {e.load && <span className="wo-chip k">{e.load}</span>}
                      {e.focus && <span className="wo-chip">{e.focus}</span>}
                    </div>
                  </div>
                </div>
                {fig && <svg className="fig" viewBox={fig.viewBox} role="img" aria-label={fig.label} dangerouslySetInnerHTML={{ __html: fig.body }} />}
                {e.tips?.length ? <ul className="wo-tips">{e.tips.map((t) => <li key={t}>{t}</li>)}</ul> : null}
                {e.alternative && <div className="wo-var"><strong>Variação:</strong> {e.alternative}</div>}
                <SetRows sets={e.sets} reps={e.reps} />
              </article>
            );
          })}
          <div className="wo-sum">
            <div className="wo-sum-h"><h2>Registro do treino</h2><span className="wo-count">0 séries</span></div>
            <pre className="wo-out">Nenhuma série marcada ainda. Anote carga e reps e toque no ✓ ao terminar cada série.</pre>
            <p className="wo-sum-n">Fica salvo neste aparelho. Ao terminar, copie e me mande, ou guarde para importar depois.</p>
            <div className="wo-foot"><button className="wo-btn wo-copy" type="button">Copiar registro</button><button className="wo-btn wo-reset" type="button">Zerar registro</button></div>
          </div>
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

function SetRows({ sets, reps }: { sets: number; reps: string }) {
  return (
    <div className="wo-rows">
      <div className="wo-rows-h"><span>Série</span><span>Carga</span><span>Reps</span><span>Feita</span></div>
      {Array.from({ length: sets }, (_, i) => (
        <div key={i} className="wo-row" data-set={i + 1}>
          <span className="wo-n">{i + 1}</span>
          <label className="wo-in"><input className="wo-kg" inputMode="decimal" autoComplete="off" placeholder="kg" aria-label={`Carga da série ${i + 1}, em kg`} /><span>kg</span></label>
          <input className="wo-reps" inputMode="numeric" autoComplete="off" placeholder={reps} aria-label={`Repetições da série ${i + 1}`} />
          <button type="button" className="wo-set" aria-pressed="false" aria-label={`Série ${i + 1} feita`}>✓</button>
        </div>
      ))}
    </div>
  );
}
