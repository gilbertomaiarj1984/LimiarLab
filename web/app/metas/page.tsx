import Link from "next/link";
import { loadContext } from "@/lib/context";
import { getActivities, getRaceResults, getRaces } from "@/lib/repo";
import { addDays, longDate, shortDate, weekStart, WEEKDAY_SHORT, weekdayIndex } from "@/lib/domain";
import { PRIORITY_LABEL, countdown, daysBetween, goalPace, raceNotes, recoveryDays, type Race } from "@/lib/races";
import { clock, km, pace } from "@/lib/format";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

const day = (iso: string) => `${WEEKDAY_SHORT[weekdayIndex(iso)]} ${shortDate(iso)}`;

function RaceCard({ r, today, refKm }: { r: Race; today: string; refKm: number | null }) {
  const notes = raceNotes(r).filter((n) => n.kind !== "prova");
  const pc = goalPace(r);
  const cut = r.priority === "A" ? [0.4, 0.6] : r.priority === "B" ? [0.7, 0.8] : null;
  return (
    <article className="race">
      <div className="race-head">
        <span className={`prio p${r.priority}`}>{r.priority} · {PRIORITY_LABEL[r.priority]}</span>
        <span className="muted">{countdown(today, r.date)}</span>
      </div>
      <h3>{r.name}</h3>
      <div className="facts">
        <span>{longDate(r.date)}</span>
        <span><b>{km(r.distanceM / 1000)}</b> km</span>
        {r.elevGainM != null && <span>D+ {Math.round(r.elevGainM)} m</span>}
        {r.goalTimeS && <span>alvo <b>{clock(r.goalTimeS)}</b>{pc ? ` · ${pc}` : ""}</span>}
      </div>
      {r.notes && <p className="note">{r.notes}</p>}
      <h4>Como entra no plano</h4>
      <ol className="race-steps">
        {notes.map((n) => (
          <li key={n.date + n.kind}><b>{day(n.date)}</b><span>{n.text}</span></li>
        ))}
      </ol>
      {cut && refKm != null && refKm > 0 && (
        <p className="muted small">
          Referência de hoje: média de {km(refKm)} km por semana nas últimas 3 semanas. {r.priority === "A" ? "No polimento" : "Na semana da prova"}, algo entre {km(refKm * cut[0])} e {km(refKm * cut[1])} km.
        </p>
      )}
    </article>
  );
}

function Timeline({ today, races }: { today: string; races: Race[] }) {
  const start = weekStart(today);
  const last = races.length ? races[races.length - 1].date : addDays(start, 7 * 8);
  const weeks = Math.max(4, Math.ceil((daysBetween(start, last) + 1 + recoveryDays(races[races.length - 1] ?? { distanceM: 0, priority: "C" })) / 7));
  const W = 520, L = 10, R = 10, T = 34, H = 86, span = weeks * 7, x = (iso: string) => L + (daysBetween(start, iso) / span) * (W - L - R);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Linha do tempo de ${shortDate(start)} até ${shortDate(addDays(start, span - 1))}, com ${races.length} prova(s)`}>
      <line className="grid" x1={L} x2={W - R} y1={T + 16} y2={T + 16} />
      {Array.from({ length: weeks + 1 }, (_, i) => addDays(start, 7 * i)).map((d, i) => (
        <g key={d}>
          <line className="grid" x1={x(d)} x2={x(d)} y1={T + 10} y2={T + 22} />
          {i < weeks && (i % Math.ceil(weeks / 6) === 0) && <text x={x(d) + 2} y={H - 4}>{shortDate(d)}</text>}
        </g>
      ))}
      <circle cx={x(today)} cy={T + 16} r={5} style={{ fill: "var(--ink)" }} />
      <text x={x(today)} y={T - 2} textAnchor="start" style={{ fontWeight: 600 }}>hoje</text>
      {races.map((r) => {
        const notes = raceNotes(r);
        const a = notes[0].date, b = notes[notes.length - 1].date;
        return (
          <g key={r.id}>
            <rect x={x(a)} y={T + 11} width={Math.max(2, x(addDays(b, 1)) - x(a))} height={10} rx={3} style={{ fill: "var(--acc-soft)" }} />
            <path d={`M${x(r.date)} ${T + 26}V${T - 6}l12 5l-12 5`} style={{ fill: "var(--acc)", stroke: "var(--acc)", strokeWidth: 2 }} />
            <text x={x(r.date) - 4} y={T - 2} textAnchor="end" style={{ fill: "var(--acc)", fontWeight: 600 }}>{km(r.distanceM / 1000)} km</text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function Metas() {
  const { athlete, today } = await loadContext();
  const start = weekStart(today);
  const [races, results, recent] = await Promise.all([
    getRaces(athlete.id, today, addDays(today, 730)),
    getRaceResults(athlete.id, addDays(today, -365), addDays(today, -1)),
    getActivities(athlete.id, addDays(start, -21), addDays(start, -1)),
  ]);
  const refKm = recent.filter((a) => a.sport === "run").reduce((s, a) => s + (a.distanceM ?? 0), 0) / 1000 / 3;
  const target = races.find((r) => r.priority === "A");
  return (
    <>
      <main className="view">
        <header><p className="eyebrow">Metas</p><h1>Provas e objetivos</h1></header>

        <section aria-labelledby="alvo-titulo">
          <div className="sec-head"><h2 id="alvo-titulo">Prova-alvo</h2><span>prioridade A</span></div>
          {target ? (
            <div className="panel"><p><b>{target.name}</b>, {longDate(target.date)}, {countdown(today, target.date)}. O polimento de 2 semanas entra no plano automaticamente.</p></div>
          ) : (
            <div className="empty">Ainda não definida. Quando você escolher a prova-alvo, o polimento de 2 semanas entra no plano, e as provas no caminho passam a ser encaixadas em função dela.</div>
          )}
        </section>

        {races.length > 0 && (
          <section aria-labelledby="linha-titulo">
            <div className="sec-head"><h2 id="linha-titulo">Até as provas</h2><span>semanas a partir de {shortDate(start)}</span></div>
            <div className="panel">
              <Timeline today={today} races={races} />
              <div className="keys"><span><i style={{ background: "var(--acc)" }} />prova</span><span><i style={{ background: "var(--acc-soft)" }} />dias ajustados em volta</span></div>
            </div>
          </section>
        )}

        <section aria-labelledby="prox-titulo">
          <div className="sec-head"><h2 id="prox-titulo">Próximas provas</h2><span>{races.length ? `${races.length} no calendário` : ""}</span></div>
          <div className="list">
            {races.length ? races.map((r) => <RaceCard key={r.id} r={r} today={today} refKm={refKm} />) : <div className="empty">Nenhuma prova cadastrada.</div>}
          </div>
        </section>

        <section aria-labelledby="feitas-titulo">
          <div className="sec-head"><h2 id="feitas-titulo">Provas feitas</h2><span>últimos 12 meses</span></div>
          <div className="list">
            {results.length ? results.map((a) => (
              <article key={a.id} className="sess plain">
                <div>
                  <h3>{a.name}</h3>
                  <div className="meta">{longDate(a.date)}</div>
                  <div className="facts">
                    {a.distanceM != null && <span><b>{km(a.distanceM / 1000)}</b> km</span>}
                    <span><b>{clock(a.durationS)}</b></span>
                    {a.distanceM ? <span>{pace(a.durationS, a.distanceM)}</span> : null}
                    {a.elevGainM != null && <span>D+ {Math.round(a.elevGainM)} m</span>}
                    {a.avgHr != null && <span>FC {a.avgHr}</span>}
                  </div>
                </div>
              </article>
            )) : <div className="empty">Nenhuma atividade marcada como prova.</div>}
          </div>
        </section>

        <p className="foot">
          A: polimento de cerca de 2 semanas com volume 40–60% menor e intensidade mantida (Bosquet et al., 2007). B: mini-polimento de uma semana, adaptado da mesma lógica (prática comum, sem estudo específico). C: a prova substitui a qualidade da semana. Os dias de recuperação são prática comum. Ver <Link href="/plano">Plano</Link>.
        </p>
      </main>
      <TabBar current="/metas" />
    </>
  );
}
