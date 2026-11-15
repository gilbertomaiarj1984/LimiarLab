import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContext } from "@/lib/context";
import { getWorkout } from "@/lib/repo";
import { isIsoDate, longDate } from "@/lib/domain";
import { FIGURES } from "@/lib/figures";
import TabBar from "@/components/TabBar";
import { SetButtons, WorkoutTracker } from "@/components/WorkoutTracker";

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

        <WorkoutTracker storageKey={`ll:series:${slug}:${day}`}>
          {w.exercises.map((e, i) => {
            const fig = e.figure ? FIGURES[e.figure] : undefined;
            return (
              <article key={i} className="wo-card" data-rest={e.rest_s ?? defRest}>
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
                <SetButtons ex={i + 1} sets={e.sets} restS={e.rest_s ?? defRest} />
              </article>
            );
          })}
        </WorkoutTracker>
        {w.reference && <p className="foot">{w.reference}</p>}
      </main>
      <TabBar current="/plano" />
    </>
  );
}
