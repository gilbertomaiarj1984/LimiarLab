import { loadContext } from "@/lib/context";
import { getActivities, getPlanned } from "@/lib/repo";
import { WEEKDAY_SHORT, addDays, matchPlan, shortDate, weekDays, weekStart, type PlanItem } from "@/lib/domain";
import { km } from "@/lib/format";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

const STATUS: Record<PlanItem["status"], string> = {
  feito: " · feito", pendente: "", sem_registro: " · sem registro", opcional: " · opcional", descanso: "",
};
const SOURCE: Record<string, string> = { garmin: "Garmin", limiarlab: "plano semanal", claude: "Claude", manual: "manual" };

function Week({ title, start, plan, today }: { title: string; start: string; plan: PlanItem[]; today: string }) {
  return (
    <section>
      <div className="sec-head"><h2>{title} · {shortDate(start)} a {shortDate(addDays(start, 6))}</h2></div>
      {plan.length === 0 ? (
        <div className="empty">Nenhum treino programado ainda. Quando a assessoria mandar os treinos ao Garmin, eles aparecem aqui.</div>
      ) : (
        <div className="box">
          {weekDays(start).map((d, i) => {
            const items = plan.filter((p) => p.date === d);
            return (
              <div key={d} className={`dayrow${d === today ? " today" : ""}`}>
                <div className="dl">{WEEKDAY_SHORT[i]}<small>{shortDate(d)}</small></div>
                <div>
                  {items.length === 0 && <div className="item muted">—</div>}
                  {items.map((p) => {
                    const state = p.status === "feito" ? "done" : p.status === "sem_registro" ? "miss" : "plan";
                    const target = [p.targetDistanceM ? `${km(p.targetDistanceM / 1000)} km` : null, p.targetHrMax ? `FC < ${p.targetHrMax}` : null].filter(Boolean).join(" · ");
                    return (
                      <div key={p.id} className="item">
                        {p.sport === "other" ? <i className="mk rest" /> : <i className={`mk ${p.sport === "run" ? "run" : "str"} ${state}`} />}
                        <div>
                          {p.sport === "strength" && !p.optional ? "Força · " : ""}{p.title}
                          <span className="muted">{STATUS[p.status]}</span>
                          <div className="src">{SOURCE[p.source] ?? p.source}{target ? ` · ${target}` : ""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function Plano() {
  const { athlete, today } = await loadContext();
  const start = weekStart(today);
  const next = addDays(start, 7);
  const [planned, acts] = await Promise.all([
    getPlanned(athlete.id, start, addDays(next, 6)),
    getActivities(athlete.id, start, addDays(start, 6)),
  ]);
  const plan = matchPlan(planned, acts, today);
  return (
    <>
      <main className="view">
        <header><p className="eyebrow">Plano</p><h1>Treinos programados</h1></header>
        <Week title="Esta semana" start={start} plan={plan.filter((p) => p.date < next)} today={today} />
        <Week title="Próxima semana" start={next} plan={plan.filter((p) => p.date >= next)} today={today} />
        <p className="foot">Corridas vêm da assessoria (Treinus) pelo Garmin; força e orientações vêm do plano do LimiarLab, gravado pela rotina do Claude.</p>
      </main>
      <TabBar current="/plano" />
    </>
  );
}
