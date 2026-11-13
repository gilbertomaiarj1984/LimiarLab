import {
  KIND_LABEL, WEEKDAY_SHORT, easyDayOffTarget, intensitySplit, shortDate, splitPercents, weekdayIndex,
  type Activity, type Physiology, type PlanItem,
} from "@/lib/domain";
import { clock, km, pace } from "@/lib/format";
import { SportIcon } from "./icons";

const dayLabel = (iso: string) => `${WEEKDAY_SHORT[weekdayIndex(iso)]} ${shortDate(iso)}`;
const SOURCE_LABEL: Record<string, string> = { garmin: "Garmin", strava: "Strava", limiarlab: "plano semanal", claude: "Claude", manual: "manual" };
const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? s;

export function ActivityCard({ a, phys, time }: { a: Activity; phys: Physiology; time: string }) {
  if (a.sport === "run") {
    const pc = a.hrZones?.length ? splitPercents(intensitySplit(a.hrZones, phys)) : null;
    const off = easyDayOffTarget(a, phys);
    return (
      <article className="sess">
        <div className="ico"><SportIcon sport="run" /></div>
        <div>
          <h3>{a.name}</h3>
          <div className="meta">
            {dayLabel(a.date)} · {time} · {KIND_LABEL[a.kind]}{a.kindInferred ? " (pelo plano)" : ""}
          </div>
          <div className="facts">
            {a.distanceM != null && <span><b>{km(a.distanceM / 1000)}</b> km</span>}
            <span><b>{clock(a.durationS)}</b></span>
            {a.distanceM ? <span>{pace(a.durationS, a.distanceM)}</span> : null}
            {a.avgHr != null && <span>FC {a.avgHr}{a.maxHr != null ? ` / ${a.maxHr}` : ""}</span>}
            {a.elevGainM != null && <span>D+ {Math.round(a.elevGainM)} m</span>}
          </div>
          <div className="chips">
            {pc && (
              <>
                <span className="chip easy">{pc.easy}% leve</span>
                <span className="chip mod">{pc.moderate}% moderado</span>
                <span className="chip hard">{pc.hard}% forte</span>
              </>
            )}
            <span className="chip">{sourceLabel(a.source)}</span>
          </div>
          {off && pc && (
            <div className="note warn">
              Dia leve fora do alvo: FC média {a.avgHr}, acima do LV1 ({phys.lv1}). Só {pc.easy}% do tempo abaixo de {phys.lv1}.
            </div>
          )}
        </div>
      </article>
    );
  }
  return (
    <article className="sess">
      <div className="ico"><SportIcon sport={a.sport} /></div>
      <div>
        <h3>{KIND_LABEL[a.kind]}</h3>
        <div className="meta">{dayLabel(a.date)} · {time} · {a.name}</div>
        <div className="facts"><span><b>{clock(a.durationS)}</b></span>{a.avgHr != null && <span>FC média {a.avgHr}</span>}</div>
        <div className="chips">
          <span className="chip">{sourceLabel(a.source)}</span>
          {a.kindInferred && <span className="chip">tipo pelo plano do dia</span>}
        </div>
      </div>
    </article>
  );
}

export function PlannedCard({ p }: { p: PlanItem }) {
  const rest = p.kind === "descanso";
  const target = [
    p.targetDistanceM ? `${km(p.targetDistanceM / 1000)} km` : null,
    p.targetDurationS ? `${Math.round(p.targetDurationS / 60)} min` : null,
    p.targetHrMax ? `FC abaixo de ${p.targetHrMax}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <article className="sess">
      <div className="ico"><SportIcon sport={p.sport} rest={rest || (p.optional && p.status === "opcional")} /></div>
      <div>
        <h3>{p.sport === "strength" && !p.title.toLowerCase().startsWith("opcional") ? `Força · ${p.title}` : p.title}</h3>
        <div className="meta">{dayLabel(p.date)} · {sourceLabel(p.source)}{target ? ` · ${target}` : ""}</div>
        {p.notes && <div className="note">{p.notes}</div>}
        {p.status === "sem_registro" && <div className="chips"><span className="chip hard">sem registro</span></div>}
      </div>
    </article>
  );
}

/** Linha compacta para a lista "Ainda nesta semana" (o dia já aparece na coluna da esquerda). */
export function UpcomingItem({ p }: { p: PlanItem }) {
  const rest = p.kind === "descanso";
  const target = [
    p.targetDistanceM ? `${km(p.targetDistanceM / 1000)} km` : null,
    p.targetDurationS ? `${Math.round(p.targetDurationS / 60)} min` : null,
    p.targetHrMax ? `FC abaixo de ${p.targetHrMax}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <div className="item">
      {rest || p.sport === "other" ? <i className="mk rest" /> : <i className={`mk ${p.sport === "run" ? "run" : "str"} plan`} />}
      <div>
        <strong>{p.sport === "strength" && !p.optional ? `Força · ${p.title}` : p.title}</strong>
        <div className="src">{sourceLabel(p.source)}{target ? ` · ${target}` : ""}</div>
        {p.notes && <div className="note">{p.notes}</div>}
      </div>
    </div>
  );
}
