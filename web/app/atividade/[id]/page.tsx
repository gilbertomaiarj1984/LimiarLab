import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContext } from "@/lib/context";
import { getActivity, getPlanned } from "@/lib/repo";
import { KIND_LABEL, inferKinds, localTime, longDate } from "@/lib/domain";
import { clock, km, pace } from "@/lib/format";
import { loadLaps } from "@/lib/sync";
import { paceSecPerKm, readLaps, type LapGroup, type LapRole } from "@/lib/laps";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<LapRole, string> = { aquecimento: "aquec.", tiro: "tiro", recuperacao: "recup.", desaquecimento: "desaq.", volta: "" };
const fmtPace = (s: number | null) => (s == null ? "—" : `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`);

function GroupLine({ title, g }: { title: string; g: LapGroup }) {
  return (
    <div className="tile">
      <span className="k">{title}</span>
      <span className="v">{g.count} <small>× {g.stationary ? `${clock(g.avgElapsedS)} parado` : g.avgDistanceM >= 1000 ? `${km(g.avgDistanceM / 1000)} km` : `${Math.round(g.avgDistanceM / 10) * 10} m`}</small></span>
      <span className="s">
        {g.paceS != null ? `pace ${fmtPace(g.paceS)}/km` : ""}{g.bestPaceS != null && g.worstPaceS != null && g.count > 1 ? ` (${fmtPace(g.bestPaceS)} a ${fmtPace(g.worstPaceS)})` : ""}
        {g.avgHr != null ? `${g.paceS != null ? " · " : ""}FC ${g.avgHr}${g.maxHr != null ? ` / máx ${g.maxHr}` : ""}` : ""}{g.stationary ? "" : ` · ${clock(g.avgElapsedS)} cada`}
      </span>
    </div>
  );
}

export default async function Atividade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { athlete, phys } = await loadContext();
  const raw = await getActivity(athlete.id, id);
  if (!raw || raw.sport !== "run") notFound();
  const planned = await getPlanned(athlete.id, raw.date, raw.date);
  const [a] = inferKinds([raw], planned);
  const { laps, motivo, erro } = await loadLaps(athlete, a.id);
  const reading = laps && laps.length ? readLaps(laps) : null;
  const plan = planned.find((p) => p.sport === "run");

  return (
    <>
      <main className="view">
        <header>
          <p className="eyebrow"><Link href={a.date === raw.date ? `/?dia=${a.date}` : "/"}>‹ {longDate(a.date)}</Link></p>
          <h1>{a.name}</h1>
          <p className="muted">{localTime(new Date(a.startTime), athlete.timezone)} · {KIND_LABEL[a.kind]}{a.kindInferred ? " (pelo plano)" : ""}</p>
        </header>

        <div className="tiles">
          {a.distanceM != null && <div className="tile"><span className="k">Distância</span><span className="v">{km(a.distanceM / 1000)} <small>km</small></span></div>}
          <div className="tile"><span className="k">Tempo</span><span className="v">{clock(a.durationS)}</span><span className="s">{a.distanceM ? `${pace(a.durationS, a.distanceM)} no geral` : ""}</span></div>
          {a.avgHr != null && <div className="tile"><span className="k">FC média / máx</span><span className="v">{a.avgHr} <small>/ {a.maxHr ?? "—"}</small></span><span className="s">LV1 {phys.lv1} · forte {phys.hardFrom}+</span></div>}
          {a.elevGainM != null && <div className="tile"><span className="k">Ganho de elevação</span><span className="v">{Math.round(a.elevGainM)} <small>m</small></span></div>}
        </div>
        {plan && <div className="note">Planejado: <strong>{plan.title}</strong>{plan.notes ? `. ${plan.notes}` : ""}</div>}

        {reading?.kind === "intervalado" && reading.work && (
          <section>
            <div className="sec-head"><h2>Resumo do intervalado</h2><span>{reading.work.count} tiros</span></div>
            <div className="tiles">
              <GroupLine title="Tiros" g={reading.work} />
              {reading.rest && <GroupLine title="Recuperações" g={reading.rest} />}
            </div>
          </section>
        )}

        <section>
          <div className="sec-head"><h2>Voltas</h2><span>{laps?.length ? `${laps.length} voltas` : ""}</span></div>
          {laps && laps.length > 0 ? (
            <div className="panel scroll">
              <table className="tbl">
                <thead><tr><th>#</th><th></th><th>Dist.</th><th>Tempo</th><th>Pace</th><th>FC</th><th>Máx</th></tr></thead>
                <tbody>
                  {laps.map((l, i) => {
                    const role = reading?.roles[i] ?? "volta";
                    const hard = l.avgHr != null && l.avgHr >= phys.hardFrom;
                    return (
                      <tr key={l.index} style={role === "tiro" ? { fontWeight: 600 } : undefined}>
                        <td>{i + 1}</td>
                        <td>{ROLE_LABEL[role] && <span className={`chip ${role === "tiro" ? "hard" : role === "recuperacao" ? "easy" : ""}`}>{ROLE_LABEL[role]}</span>}</td>
                        <td>{l.distanceM >= 1000 ? `${km(l.distanceM / 1000)} km` : `${Math.round(l.distanceM)} m`}</td>
                        <td>{clock(l.elapsedS)}</td>
                        <td>{fmtPace(paceSecPerKm(l))}</td>
                        <td style={hard ? { color: "var(--hard)", fontWeight: 600 } : undefined}>{l.avgHr ?? "—"}</td>
                        <td>{l.maxHr ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              {motivo === "sem_strava" && "Ainda não achei esta corrida no Strava. Volte ao Início e toque em Atualizar (ou Perfil → Histórico → Carregar), depois abra de novo."}
              {motivo === "erro" && `Não consegui buscar as voltas: ${erro}`}
              {!motivo && "Esta corrida não tem voltas registradas."}
            </div>
          )}
          {reading?.kind === "continuo" && laps && laps.length > 0 && <p className="foot">Ritmo parecido nas voltas: tratado como corrida contínua, sem tiros.</p>}
          <p className="foot">Voltas vindas do Strava (as do relógio). Pace em min/km; FC em vermelho a partir de {phys.hardFrom} bpm.</p>
        </section>
      </main>
      <TabBar current="/" />
    </>
  );
}
