// Bloco "ESTADO ATUAL" do contexto da IA: texto gerado na hora a partir dos dados do app, para o contexto
// se atualizar sozinho a cada atividade, prova ou treino de força registrados. Função pura (testada em estado.test.ts).
import { KIND_LABEL, WEEKDAY_SHORT, addDays, easyDayOffTarget, intensitySplit, shortDate, splitPercents, sumSplits, weekStart, weekdayIndex, type Activity, type Physiology, type Planned } from "../domain.ts";
import { NOME_REGIAO, FOCO, volumeSemanal, alertas, VOLUME_REF } from "../musculos.ts";
import { aderencia, MOTIVOS, type RegistroForca } from "../forca.ts";
import { countdown, goalPace, PRIORITY_LABEL, type Race } from "../races.ts";

export type EstadoInput = {
  today: string;
  phys: Physiology;
  /** Atividades de pelo menos as últimas 4 semanas fechadas + a atual. */
  activities: Activity[];
  planned: Planned[];
  races: Race[];
  strengthLogs: RegistroForca[];
  /** Objetivo do atleta (campo "goal" do cadastro). */
  goal?: string | null;
  /** Registros de fisiologia (testes), do mais antigo ao mais novo, para mostrar a evolução. */
  physHistory?: { validFrom: string; lv1: number; lv2: number; hrMax: number | null; vo2max: number | null; source: string }[];
};

const WEEKS_BACK = 4;
const f1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const dm = (iso: string) => `${shortDate(iso)}`;
const dist = (m: number | null) => (m == null ? "" : `${f1(m / 1000)} km`);
const dur = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}h` : ""}${String(Math.round((s % 3600) / 60)).padStart(Math.floor(s / 3600) ? 2 : 1, "0")}min`;

export function formatEstado(i: EstadoInput): string {
  const { today, phys } = i;
  const L: string[] = [];
  L.push(`ESTADO ATUAL DO APP (gerado hoje, ${WEEKDAY_SHORT[weekdayIndex(today)]} ${dm(today)}; vale mais que qualquer data ou número do texto acima)`);

  if (i.goal) L.push(`- Objetivo: ${i.goal}`);
  if (i.physHistory && i.physHistory.length > 0)
    L.push("- Limiares ao longo do tempo: " + i.physHistory.map((h) => `${dm(h.validFrom)}/${h.validFrom.slice(0, 4)} LV1 ${h.lv1} LV2 ${h.lv2}${h.hrMax ? ` FCmáx ${h.hrMax}` : ""}${h.vo2max ? ` VO2máx ${h.vo2max}` : ""} (${h.source})`).join("; ") + ".");

  // Provas
  const races = i.races.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = i.races.filter((r) => r.date < today).sort((a, b) => b.date.localeCompare(a.date));
  if (past.length) L.push("- Provas recentes: " + past.map((r) => `${dm(r.date)}/${r.date.slice(0, 4)} ${r.name} ${f1(r.distanceM / 1000)} km`).join("; ") + ".");
  if (races.length === 0) L.push("- Provas: nenhuma cadastrada à frente.");
  else {
    L.push("- Provas à frente: " + races.map((r) => `${dm(r.date)} ${r.name} ${f1(r.distanceM / 1000)} km (${PRIORITY_LABEL[r.priority]}${r.elevGainM ? `, ${Math.round(r.elevGainM)} m de ganho` : ""}${goalPace(r) ? `, meta ${goalPace(r)}` : ""}; ${countdown(today, r.date)})`).join("; ") + ".");
    if (!races.some((r) => r.priority === "A")) L.push("- Ainda não há prova-alvo (A) definida.");
  }

  // Corrida por semana
  const thisWeek = weekStart(today);
  const starts = Array.from({ length: WEEKS_BACK + 1 }, (_, k) => addDays(thisWeek, -7 * (WEEKS_BACK - k)));
  const runLines: string[] = [];
  let offTotal = 0, easyTotal = 0;
  for (const s of starts) {
    const e = addDays(s, 6);
    const wk = i.activities.filter((a) => a.date >= s && a.date <= e);
    const runs = wk.filter((a) => a.sport === "run");
    if (runs.length === 0 && s !== thisWeek) { runLines.push(`  · semana de ${dm(s)}: sem corridas registradas`); continue; }
    const km = runs.reduce((t, a) => t + (a.distanceM ?? 0), 0) / 1000;
    const longest = Math.max(0, ...runs.map((a) => (a.distanceM ?? 0) / 1000));
    const p = splitPercents(sumSplits(runs.filter((a) => a.hrZones?.length).map((a) => intensitySplit(a.hrZones!, phys))));
    const easy = runs.filter((a) => ["corrida_leve", "longo"].includes(a.kind) && a.avgHr != null);
    const off = easy.filter((a) => easyDayOffTarget(a, phys)).length;
    offTotal += off; easyTotal += easy.length;
    runLines.push(`  · semana de ${dm(s)}${s === thisWeek ? " (em andamento)" : ""}: ${f1(km)} km em ${runs.length} corrida(s), maior ${f1(longest)} km${p ? `, tempo ${p.easy}% leve / ${p.moderate}% moderado / ${p.hard}% forte` : ""}${easy.length ? `, leves/longos acima do LV1: ${off} de ${easy.length}, FC média dos leves ${Math.round(easy.reduce((t, a) => t + (a.avgHr ?? 0), 0) / easy.length)}` : ""}`);
  }
  L.push("- Corrida por semana (últimas 4 + atual):", ...runLines);
  if (easyTotal) L.push(`- Dias leves e longos com FC média no LV1 ou acima, no período: ${offTotal} de ${easyTotal}.`);

  // Últimas atividades
  const last = [...i.activities].sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 6);
  if (last.length) L.push("- Últimas atividades: " + last.map((a) => `${dm(a.date)} ${KIND_LABEL[a.kind]}${a.distanceM ? ` ${dist(a.distanceM)}` : ""} ${dur(a.durationS)}${a.avgHr ? ` FC ${a.avgHr}` : ""}`).join("; ") + ".");

  // Força
  const fStart = starts[0];
  const logs = i.strengthLogs.filter((r) => r.data >= fStart && r.data <= today);
  const strengthDone = i.activities.filter((a) => a.sport === "strength");
  L.push(`- Força nas últimas 4 semanas + atual: ${strengthDone.length} sessão(ões) no relógio, ${logs.length} confirmada(s) com o que foi feito.`);
  if (logs.length) {
    const ad = aderencia([], logs);
    const pse = logs.map((r) => r.pse).filter((v): v is number => v != null);
    L.push(`  · séries feitas ${ad.series.feitas} de ${ad.series.plano} planejadas; exercícios: ${ad.exercicios.feito} feitos, ${ad.exercicios.parcial} parciais, ${ad.exercicios.nao_feito} não feitos, ${ad.exercicios.trocados} trocados${pse.length ? `; PSE média ${f1(pse.reduce((t, v) => t + v, 0) / pse.length)}` : ""}.`);
    const motivos = Object.entries(ad.motivos).map(([k, n]) => `${MOTIVOS[k as keyof typeof MOTIVOS]} ${n}`);
    if (motivos.length) L.push(`  · motivos de troca ou incompleto: ${motivos.join(", ")}.`);
    if (ad.trocas.length) L.push("  · trocas: " + ad.trocas.slice(0, 5).map((t) => `${t.de} → ${t.para} (${t.vezes}x)`).join("; ") + ".");
    const semanas = volumeSemanal(starts, logs);
    for (const w of semanas) {
      const foco = FOCO.map((r) => `${NOME_REGIAO[r].toLowerCase()} ${f1(w.series[r])}`).join(", ");
      const closed = w.inicio < thisWeek;
      const al = closed ? alertas(w.series).map((a) => `${NOME_REGIAO[a.regiao].toLowerCase()} ${a.tipo === "pouco" ? "abaixo de" : "acima de"} ${a.tipo === "pouco" ? VOLUME_REF.pouco : VOLUME_REF.excesso} séries`) : [];
      if (Object.values(w.series).some((v) => v > 0)) L.push(`  · séries semanais (semana de ${dm(w.inicio)}${closed ? "" : ", em andamento"}), foco da corrida: ${foco}${al.length ? `; alertas: ${al.join(", ")}` : ""}`);
    }
  }

  // Plano dos próximos 7 dias
  const nxt = i.planned.filter((p) => p.date >= today && p.date <= addDays(today, 7) && p.kind !== "descanso").sort((a, b) => a.date.localeCompare(b.date));
  if (nxt.length) L.push("- Plano dos próximos 7 dias: " + nxt.map((p) => `${WEEKDAY_SHORT[weekdayIndex(p.date)]} ${dm(p.date)} ${p.title}${p.targetDistanceM ? ` ${dist(p.targetDistanceM)}` : ""}${p.targetDurationS ? ` ${dur(p.targetDurationS)}` : ""}${p.targetHrMax ? ` FC<${p.targetHrMax}` : ""}${p.optional ? " (opcional)" : ""}`).join("; ") + ".");
  return L.join("\n");
}
