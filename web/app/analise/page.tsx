import { loadContext } from "@/lib/context";
import { getActivities, getPlanned } from "@/lib/repo";
import {
  EASY_KINDS, addDays, inferKinds, intensitySplit, shortDate, splitPercents, sumSplits, weekStart,
  type Activity, type Physiology,
} from "@/lib/domain";
import { hm, km } from "@/lib/format";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";
const WEEKS = 5;

type W = { start: string; km: number; seconds: number; elev: number; longest: number; strength: number; lower: number; upper: number; race: boolean; pc: ReturnType<typeof splitPercents> };

function summarize(start: string, acts: Activity[], phys: Physiology): W {
  const l = acts.filter((a) => a.date >= start && a.date <= addDays(start, 6));
  const runs = l.filter((a) => a.sport === "run");
  return {
    start,
    km: runs.reduce((s, a) => s + (a.distanceM ?? 0), 0) / 1000,
    seconds: runs.reduce((s, a) => s + a.durationS, 0),
    elev: runs.reduce((s, a) => s + (a.elevGainM ?? 0), 0),
    longest: runs.reduce((m, a) => Math.max(m, (a.distanceM ?? 0) / 1000), 0),
    strength: l.filter((a) => a.sport === "strength").length,
    lower: l.filter((a) => a.kind === "forca_inferiores").length,
    upper: l.filter((a) => a.kind === "forca_superiores").length,
    race: runs.some((a) => a.kind === "prova"),
    pc: splitPercents(sumSplits(runs.filter((a) => a.hrZones?.length).map((a) => intensitySplit(a.hrZones!, phys)))),
  };
}

export default async function Analise() {
  const { athlete, today, phys } = await loadContext();
  const cur = weekStart(today);
  const first = addDays(cur, -7 * (WEEKS - 1));
  const end = addDays(cur, 6);
  const [raw, planned] = await Promise.all([getActivities(athlete.id, first, end), getPlanned(athlete.id, first, end)]);
  const acts = inferKinds(raw, planned);
  const weeks = Array.from({ length: WEEKS }, (_, i) => summarize(addDays(first, 7 * i), acts, phys));
  const runs = acts.filter((a) => a.sport === "run" && a.avgHr != null);
  const maxEasy = Math.max(0, ...weeks.map((w) => w.pc?.easy ?? 0));

  // Volume (barras verticais)
  const VW = 520, VH = 220, VL = 40, VR = 10, VT = 26, VB = 30, vih = VH - VT - VB, viw = VW - VL - VR;
  const vmax = Math.max(20, Math.ceil(Math.max(...weeks.map((w) => w.km)) / 20) * 20);
  const vy = (v: number) => VT + vih - (v / vmax) * vih;
  const bw = (viw / WEEKS) * 0.56;
  const ticks = Array.from({ length: vmax / 20 + 1 }, (_, i) => i * 20);

  // FC média por corrida
  const FW = 520, FH = 240, FL = 40, FR = 92, FT = 16, FB = 28, fiw = FW - FL - FR, fih = FH - FT - FB;
  const hrs = runs.map((a) => a.avgHr!);
  const ylo = Math.min(phys.easyTarget - 5, ...hrs) - 2, yhi = Math.max(phys.lv1 + 10, ...hrs) + 2;
  const t0 = Date.parse(first), t1 = Date.parse(addDays(end, 1));
  const fx = (d: string) => FL + ((Date.parse(d) - t0) / (t1 - t0)) * fiw;
  const fy = (v: number) => FT + fih - ((v - ylo) / (yhi - ylo)) * fih;
  const fticks = [130, 140, 150, 160, 170].filter((v) => v > ylo && v < yhi);

  // Intensidade (barras 100%)
  const IW = 520, rowH = 30, IL = 60, IR = 24, IT = 28, iiw = IW - IL - IR;
  const iEnd = IT + WEEKS * (rowH + 10) - 10;

  return (
    <>
      <main className="view">
        <header><p className="eyebrow">Análise</p><h1>Últimas {WEEKS} semanas</h1></header>

        <section>
          <div className="sec-head"><h2>Volume de corrida</h2><span>km por semana</span></div>
          <div className="panel">
            <svg className="chart" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="Quilômetros de corrida por semana">
              {ticks.map((v) => (
                <g key={v}><line className="grid" x1={VL} x2={VW - VR} y1={vy(v)} y2={vy(v)} /><text x={VL - 6} y={vy(v) + 5} textAnchor="end">{v}</text></g>
              ))}
              {weeks.map((w, i) => {
                const cx = VL + (viw / WEEKS) * (i + 0.5);
                return (
                  <g key={w.start}>
                    <rect x={cx - bw / 2} y={vy(w.km)} width={bw} height={vy(0) - vy(w.km)} rx={3} style={{ fill: w.race ? "var(--acc)" : "var(--ink)" }} />
                    <text className="lbl" x={cx} y={vy(w.km) - 6} textAnchor="middle">{km(w.km)}</text>
                    <text x={cx} y={VH - 8} textAnchor="middle">{shortDate(w.start)}</text>
                  </g>
                );
              })}
            </svg>
            <div className="keys"><span><i style={{ background: "var(--ink)" }} />feito</span><span><i style={{ background: "var(--acc)" }} />semana com prova</span></div>
          </div>
        </section>

        <section>
          <div className="sec-head"><h2>Distribuição de intensidade</h2><span>tempo de corrida na zona</span></div>
          <div className="panel">
            <svg className="chart" viewBox={`0 0 ${IW} ${iEnd + 26}`} role="img" aria-label="Percentual do tempo de corrida em cada faixa, por semana">
              <text x={IL} y={16}>0%</text><text x={IL + iiw / 2} y={16} textAnchor="middle">50%</text><text x={IL + iiw} y={16} textAnchor="end">100%</text>
              {weeks.map((w, i) => {
                const y = IT + i * (rowH + 10);
                if (!w.pc) return <g key={w.start}><text x={IL - 8} y={y + rowH / 2 + 5} textAnchor="end">{shortDate(w.start)}</text><text x={IL} y={y + rowH / 2 + 5}>sem corridas</text></g>;
                const segs: [number, string][] = [[w.pc.easy, "var(--easy)"], [w.pc.moderate, "var(--mod)"], [w.pc.hard, "var(--hard)"]];
                let x = IL;
                return (
                  <g key={w.start}>
                    <text x={IL - 8} y={y + rowH / 2 + 5} textAnchor="end">{shortDate(w.start)}</text>
                    {segs.map(([v, c], j) => {
                      const wd = (v / 100) * iiw, x0 = x;
                      x += wd;
                      return (
                        <g key={j}>
                          <rect x={x0} y={y} width={wd} height={rowH} style={{ fill: c }} />
                          {v >= 10 && <text x={x0 + wd / 2} y={y + rowH / 2 + 5} textAnchor="middle" style={{ fill: "#fff", fontWeight: 600 }}>{v}%</text>}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              <line className="ref" x1={IL + iiw * 0.8} x2={IL + iiw * 0.8} y1={IT - 4} y2={iEnd + 4} />
              <text x={IL + iiw * 0.8} y={iEnd + 20} textAnchor="middle">meta ~80% leve</text>
            </svg>
            <div className="keys"><span><i className="e" />leve, abaixo de {phys.lv1}</span><span><i className="m" />moderado, {phys.lv1} a {phys.hardFrom - 1}</span><span><i className="h" />forte, {phys.hardFrom} ou mais</span></div>
            <p>No período, o tempo leve chegou no máximo a {maxEasy}% numa semana. A referência para endurance é perto de 80% abaixo do LV1, com o resto concentrado em sessões fortes de verdade.</p>
          </div>
        </section>

        <section>
          <div className="sec-head"><h2>FC média de cada corrida</h2><span>{shortDate(first)} a {shortDate(today)}</span></div>
          <div className="panel">
            <svg className="chart" viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label={`FC média de cada corrida, com o LV1 em ${phys.lv1} e a meta dos dias leves em ${phys.easyTarget}`}>
              {fticks.map((v) => <g key={v}><line className="grid" x1={FL} x2={FL + fiw} y1={fy(v)} y2={fy(v)} /><text x={FL - 6} y={fy(v) + 5} textAnchor="end">{v}</text></g>)}
              <line className="ref" x1={FL} x2={FL + fiw} y1={fy(phys.lv1)} y2={fy(phys.lv1)} />
              <text x={FL + fiw + 6} y={fy(phys.lv1) + 5} style={{ fill: "var(--ink)", fontWeight: 600 }}>LV1 {phys.lv1}</text>
              <line className="refg" x1={FL} x2={FL + fiw} y1={fy(phys.easyTarget)} y2={fy(phys.easyTarget)} />
              <text x={FL + fiw + 6} y={fy(phys.easyTarget) + 5} style={{ fill: "var(--easy)", fontWeight: 600 }}>meta {phys.easyTarget}</text>
              {weeks.map((w) => <text key={w.start} x={fx(w.start)} y={FH - 6} textAnchor="middle">{shortDate(w.start)}</text>)}
              {runs.map((a) => (
                <circle key={a.id} cx={fx(a.date)} cy={fy(a.avgHr!)} r={5.5} style={{ fill: EASY_KINDS.includes(a.kind) ? "var(--acc)" : "var(--muted)", stroke: "var(--card)", strokeWidth: 1.5 }}>
                  <title>{`${shortDate(a.date)} · ${a.name} · FC ${a.avgHr}`}</title>
                </circle>
              ))}
            </svg>
            <div className="keys"><span><i className="dot" style={{ background: "var(--acc)" }} />dia que deveria ser leve (rodagem ou longo)</span><span><i className="dot" style={{ background: "var(--muted)" }} />qualidade, prova ou sem tipo</span></div>
          </div>
        </section>

        <section>
          <div className="sec-head"><h2>Resumo por semana</h2><span>registrado</span></div>
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Semana</th><th>Km</th><th>Tempo</th><th>D+ m</th><th>Maior</th><th>Força (inf+sup)</th><th>Leve</th></tr></thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.start}>
                    <td>{shortDate(w.start)}{w.start === cur ? " *" : ""}</td><td>{km(w.km)}</td><td>{hm(w.seconds)}</td><td>{Math.round(w.elev)}</td>
                    <td>{km(w.longest)}</td><td>{w.strength}{w.lower + w.upper > 0 ? ` (${w.lower}+${w.upper})` : ""}</td><td>{w.pc ? `${w.pc.easy}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="foot">* Semana em andamento. Inferiores e superiores só aparecem quando há treino de força planejado no dia; sem plano, a sessão conta só no total.</p>
        </section>
      </main>
      <TabBar current="/analise" />
    </>
  );
}
