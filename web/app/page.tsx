import Link from "next/link";
import { loadContext } from "@/lib/context";
import { getActivities, getPlanned, getRaces } from "@/lib/repo";
import { countdown, notesForDay, PRIORITY_LABEL } from "@/lib/races";
import {
  WEEKDAY_LONG, WEEKDAY_SHORT, addDays, inferKinds, isIsoDate, localTime, longDate, matchPlan, shortDate, splitPercents,
  weekDays, weekStart, weekStats, weekdayIndex, VOLUME_JUMP_WARN,
} from "@/lib/domain";
import { hm, km } from "@/lib/format";
import { ActivityCard, PlannedCard, UpcomingItem } from "@/components/Cards";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { athlete, today, phys } = await loadContext();
  const { dia } = await searchParams;
  // A semana exibida é a do dia escolhido (?dia=); sem ele, a semana de hoje. Semana começa na segunda.
  const pick = dia && isIsoDate(dia) && Math.abs(Date.parse(dia) - Date.parse(today)) <= 366 * 864e5 ? dia : today;
  const start = weekStart(pick);
  const end = addDays(start, 6);
  const days = weekDays(start);
  const thisWeek = weekStart(today);
  const isCurrent = start === thisWeek;
  const isFuture = start > today;
  const isNext = start === addDays(thisWeek, 7);
  const sel = pick;
  const dayHref = (d: string) => (d === today ? "/" : `/?dia=${d}`);

  const [rawActs, planned, prevActs, races] = await Promise.all([
    getActivities(athlete.id, start, end),
    getPlanned(athlete.id, start, end),
    getActivities(athlete.id, addDays(start, -7), addDays(start, -1)),
    getRaces(athlete.id, addDays(start, -21), addDays(today > end ? today : end, 400)),
  ]);
  const nextRace = races.find((r) => r.date >= today);
  const selNotes = notesForDay(sel, races);
  const acts = inferKinds(rawActs, planned);
  const plan = matchPlan(planned, acts, today);
  const s = weekStats(acts, plan, prevActs, phys, today);
  const pc = splitPercents(s.intensity);
  const time = (iso: string) => localTime(new Date(iso), athlete.timezone);

  const selActs = acts.filter((a) => a.date === sel);
  const selPlan = plan.filter((p) => p.date === sel && p.status !== "feito");
  const upcoming = plan.filter((p) => p.date > today);
  const history = [...acts].sort((a, b) => b.startTime.localeCompare(a.startTime));
  const tomorrow = plan.find((p) => p.date === addDays(today, 1) && p.sport === "run");
  const selTitle = sel === today ? "Hoje" : `${longDate(sel).split(",")[0]}, ${shortDate(sel)}`;
  const longestAct = acts.filter((a) => a.sport === "run").reduce<typeof acts[number] | null>(
    (b, a) => ((a.distanceM ?? 0) > (b?.distanceM ?? -1) ? a : b), null);

  return (
    <>
      <main className="view">
        <header>
          <p className="eyebrow">LimiarLab · {athlete.name}</p>
          <h1>{longDate(today)}</h1>
        </header>

        {nextRace && (
          <Link href="/metas" className="racebar">
            <span>Próxima prova: <b>{nextRace.name}</b> · {shortDate(nextRace.date)} · {PRIORITY_LABEL[nextRace.priority].toLowerCase()}</span>
            <span className="muted">{countdown(today, nextRace.date)} ›</span>
          </Link>
        )}

        <section aria-label="Semana">
          <div className="sec-head">
            <h2>{isNext ? "Próxima semana" : "Semana"} de {shortDate(start)} a {shortDate(end)}</h2>
            <nav className="weeknav" aria-label="Trocar de semana">
              <Link href={dayHref(addDays(start, -7))} scroll={false} aria-label="Semana anterior">‹</Link>
              {!isCurrent && <Link href="/" className="now" scroll={false}>hoje</Link>}
              <Link href={dayHref(addDays(start, 7))} scroll={false} aria-label="Semana seguinte">›</Link>
            </nav>
          </div>
          <div className="week">
            {days.map((d) => {
              const done = acts.filter((a) => a.date === d);
              const open = plan.filter((p) => p.date === d && (p.status === "pendente" || p.status === "sem_registro") && p.sport !== "other");
              return (
                <Link
                  key={d}
                  href={dayHref(d)}
                  className="day"
                  aria-pressed={d === sel}
                  aria-current={d === today ? "date" : undefined}
                  aria-label={`${WEEKDAY_SHORT[weekdayIndex(d)]} ${shortDate(d)}`}
                  scroll={false}
                >
                  <span className="dw">{WEEKDAY_SHORT[weekdayIndex(d)]}</span>
                  <span className="dn">{Number(d.slice(8))}</span>
                  <span className="marks">
                    {races.some((r) => r.date === d) && <i className="mk flag" />}
                    {done.map((a) => <i key={a.id} className={`mk ${a.sport === "run" ? "run" : "str"} done`} />)}
                    {open.map((p) => <i key={p.id} className={`mk ${p.sport === "run" ? "run" : "str"} ${p.status === "sem_registro" ? "miss" : "plan"}`} />)}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="mk run done" />corrida feita</span>
            <span><i className="mk run plan" />corrida planejada</span>
            <span><i className="mk str done" />força feita</span>
            <span><i className="mk str miss" />planejado sem registro</span>
            {races.some((r) => r.date >= start && r.date <= end) && <span><i className="mk flag" />prova</span>}
          </div>
        </section>

        <section aria-labelledby="dia-titulo">
          <div className="sec-head">
            <h2 id="dia-titulo">{selTitle}</h2>
            <span>{selActs.length ? `${selActs.length} realizado${selActs.length > 1 ? "s" : ""}` : ""}</span>
          </div>
          <div className="list">
            {selNotes.map((n) => <div key={n.raceId + n.kind} className={`note race-n${n.kind === "prova" ? " strong" : ""}`}>{n.kind === "prova" ? <b>{n.text}</b> : n.text}</div>)}
            {selActs.map((a) => <ActivityCard key={a.id} a={a} phys={phys} time={time(a.startTime)} />)}
            {selPlan.map((p) => <PlannedCard key={p.id} p={p} />)}
            {!selActs.length && !selPlan.length && !selNotes.length && <div className="empty">Nada planejado nem registrado neste dia.</div>}
            {sel === today && tomorrow && (
              <div className="note">Amanhã: <strong>{tomorrow.title}</strong>.{tomorrow.targetHrMax ? ` Alvo: FC abaixo de ${tomorrow.targetHrMax}.` : ""}</div>
            )}
          </div>
        </section>

        {today < end && (
          <section aria-labelledby="prox-titulo">
            <div className="sec-head"><h2 id="prox-titulo">{isFuture ? "Programado na semana" : "Ainda nesta semana"}</h2><span>{isFuture ? "seg a dom" : "até domingo"}</span></div>
            <div className="box">
              {days.filter((d) => d > today).map((d) => {
                const items = upcoming.filter((p) => p.date === d);
                return (
                  <div key={d} className="dayrow wide">
                    <div className="dl">{WEEKDAY_LONG[weekdayIndex(d)]}<small>{shortDate(d)}</small></div>
                    <div>
                      {notesForDay(d, races).map((n) => <div key={n.raceId + n.kind} className="note race-n">{n.text}</div>)}
                      {items.length === 0 && !notesForDay(d, races).length && <div className="item muted">Nada planejado</div>}
                      {items.map((p) => <UpcomingItem key={p.id} p={p} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isCurrent && today === end && (
          <div className="note">A semana fecha hoje. <Link href={`/?dia=${addDays(end, 1)}`} className="wk">Ver a próxima semana ›</Link></div>
        )}

        {!isFuture && (<>
        <section aria-labelledby="stats-titulo">
          <div className="sec-head"><h2 id="stats-titulo">Estatísticas da semana</h2><span>{isCurrent ? "seg a hoje" : "semana completa"}</span></div>
          <div className="tiles">
            <div className="tile"><span className="k">Corrida</span><span className="v">{km(s.run.km)} <small>km</small></span><span className="s">{hm(s.run.seconds)} em {s.run.count} corrida{s.run.count === 1 ? "" : "s"}</span></div>
            <div className="tile"><span className="k">Ganho de elevação</span><span className="v">{Math.round(s.run.elevGainM)} <small>m</small></span><span className="s">D+ das corridas</span></div>
            <div className="tile"><span className="k">Força</span><span className="v">{s.strength.count} <small>sess{s.strength.count === 1 ? "ão" : "ões"}</small></span><span className="s">{s.strength.lower} inferiores · {s.strength.upper} superiores{s.strength.other ? ` · ${s.strength.other} sem tipo` : ""} · {hm(s.strength.seconds)}</span></div>
            <div className="tile"><span className="k">Treino total</span><span className="v">{hm(s.totalSeconds)}</span><span className="s">todas as atividades</span></div>
            <div className="tile"><span className="k">Maior corrida</span><span className="v">{km(s.run.longestKm)} <small>km</small></span><span className="s">{longestAct ? longestAct.name : "nenhuma ainda"}</span></div>
            <div className="tile"><span className="k">Plano cumprido</span>{s.plan.total === 0 ? <><span className="v">—</span><span className="s">sem plano registrado</span></> : <><span className="v">{s.plan.doneDue} <small>de {s.plan.due}</small></span><span className="s">{isCurrent ? `até hoje · ${s.plan.total} na semana` : `${s.plan.total} na semana`}</span></>}</div>
          </div>

          <div className="panel">
            <h3>Intensidade da corrida, por tempo na zona</h3>
            {pc ? (
              <>
                <div className="bar" role="img" aria-label={`${pc.easy}% leve, ${pc.moderate}% moderado, ${pc.hard}% forte`}>
                  <i className="e" style={{ width: `${pc.easy}%` }} /><i className="m" style={{ width: `${pc.moderate}%` }} /><i className="h" style={{ width: `${pc.hard}%` }} />
                </div>
                <div className="target" style={{ ["--t" as string]: "80%" }}><span>meta ~80% leve</span></div>
                <div className="zones">
                  <div className="ze"><b>{pc.easy}%</b><span>leve · abaixo de {phys.lv1}</span><span className="muted">{hm(s.intensity.easy)}</span></div>
                  <div className="zm"><b>{pc.moderate}%</b><span>moderado · {phys.lv1} a {phys.hardFrom - 1}</span><span className="muted">{hm(s.intensity.moderate)}</span></div>
                  <div className="zh"><b>{pc.hard}%</b><span>forte · {phys.hardFrom} ou mais</span><span className="muted">{hm(s.intensity.hard)}</span></div>
                </div>
              </>
            ) : (
              <p className="muted">Sem corridas com zonas de FC nesta semana.</p>
            )}
          </div>

          <div className="panel">
            <h3>Volume de corrida vs. semana anterior</h3>
            <VolumeBars prev={s.volume.prevKm} done={s.volume.currentKm} planned={s.volume.plannedRemainingKm} prevLabel={`${shortDate(addDays(start, -7))}–${shortDate(addDays(start, -1))}`} curLabel={`${shortDate(start)}–${shortDate(end)}`} />
            <p>
              {s.volume.delta == null
                ? "Sem corridas na semana anterior para comparar."
                : `${s.volume.plannedRemainingKm > 0 ? "Com o que está planejado, a semana fecha" : "A semana está"} em ${km(s.volume.projectedKm)} km, ${Math.abs(Math.round(s.volume.delta * 100))}% ${s.volume.delta < 0 ? "abaixo" : "acima"} da anterior. `}
              {s.volume.warn
                ? `Atenção: salto acima de ${VOLUME_JUMP_WARN * 100}%. Num estudo com iniciantes (Nielsen et al., 2014), saltos assim tiveram mais lesões por sobrecarga, mas a diferença não foi estatisticamente significativa. Vale cautela.`
                : s.volume.delta != null ? `Sem salto de volume (o aviso aparece acima de ${VOLUME_JUMP_WARN * 100}%).` : ""}
            </p>
          </div>
        </section>

        <section aria-labelledby="hist-titulo">
          <div className="sec-head"><h2 id="hist-titulo">Realizados</h2><span>mais recente primeiro</span></div>
          <div className="list">
            {history.length ? history.map((a) => <ActivityCard key={a.id} a={a} phys={phys} time={time(a.startTime)} />) : <div className="empty">Nada registrado nesta semana ainda.</div>}
          </div>
        </section>
        </>)}

        <p className="foot">
          Zonas pelo teste de {shortDate(phys.validFrom)}/{phys.validFrom.slice(0, 4)}: leve abaixo de {phys.lv1} bpm (LV1), forte a partir de {phys.hardFrom} bpm. O Garmin registra só &quot;força&quot;; inferiores ou superiores vem do plano do dia.
        </p>
      </main>
      <TabBar current="/" />
    </>
  );
}

function VolumeBars({ prev, done, planned, prevLabel, curLabel }: { prev: number; done: number; planned: number; prevLabel: string; curLabel: string }) {
  const max = Math.max(prev, done + planned, 1);
  return (
    <div className="vol">
      <span>{prevLabel}</span><span className="track"><i style={{ width: `${(prev / max) * 100}%` }} /></span><span>{km(prev)} km</span>
      <span>{curLabel}</span>
      <span className="track"><i style={{ width: `${(done / max) * 100}%` }} />{planned > 0 && <i className="proj" style={{ width: `${(planned / max) * 100}%` }} />}</span>
      <span>{km(done)}{planned > 0 ? ` + ${km(planned)}` : ""} km</span>
    </div>
  );
}
