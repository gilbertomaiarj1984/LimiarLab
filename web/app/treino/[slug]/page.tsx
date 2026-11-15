import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContext } from "@/lib/context";
import { getWorkout } from "@/lib/repo";
import { isIsoDate, longDate } from "@/lib/domain";
import TabBar from "@/components/TabBar";
import ExerciseCheck from "@/components/ExerciseCheck";

export const dynamic = "force-dynamic";

export default async function Treino({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dia?: string }> }) {
  const { slug } = await params;
  const { dia } = await searchParams;
  const { athlete, today } = await loadContext();
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) notFound();
  const w = await getWorkout(athlete.id, slug);
  if (!w) notFound();
  const day = dia && isIsoDate(dia) ? dia : today;
  const back = day === today ? "/" : `/?dia=${day}`;
  const facts = [w.duration, w.rir ? `${w.rir} repetições sobrando` : null, w.rest ? `descanso ${w.rest}` : null].filter(Boolean);
  const sets = w.exercises.reduce((s, e) => s + e.sets, 0);
  return (
    <>
      <main className="view">
        <header>
          <p className="eyebrow"><Link href={back}>‹ {longDate(day)}</Link></p>
          <h1>{w.title}</h1>
        </header>
        <section className="panel">
          {w.goal && <p>{w.goal}</p>}
          <div className="facts">{facts.map((f) => <span key={f}>{f}</span>)}<span>{w.exercises.length} exercícios · {sets} séries</span></div>
          {w.warmup && <p><b>Aquecimento:</b> {w.warmup}</p>}
          {w.load_note && <p><b>Carga:</b> {w.load_note}</p>}
        </section>
        <section aria-label="Exercícios">
          <div className="sec-head"><h2>Exercícios</h2><span>marque ao terminar</span></div>
          <ol className="list exlist">
            {w.exercises.map((e, i) => (
              <li key={i} className="sess ex">
                <ExerciseCheck id={`ll:treino:${slug}:${day}:${i}`} label={e.name} />
                <div>
                  <h3>{e.name}</h3>
                  <div className="facts"><span><b>{e.sets} × {e.reps}</b></span>{e.load && <span>{e.load}</span>}</div>
                  {e.focus && <div className="chips"><span className="chip">{e.focus}</span></div>}
                  {e.tips?.length ? <ul className="tips">{e.tips.map((t) => <li key={t}>{t}</li>)}</ul> : null}
                  {e.alternative && <div className="note">Variação: {e.alternative}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>
        {w.reference && <p className="foot">{w.reference}</p>}
      </main>
      <TabBar current="/plano" />
    </>
  );
}
