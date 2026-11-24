// Feedback de IA pós-corrida: monta os dados do treino em texto compacto e lê a resposta estruturada.
// Funções puras (testadas em feedback.test.ts). A parte com banco e IA fica em feedback-store.ts.
//
// Por que texto compacto e não o JSON bruto do treino: o Groq free limita ~8K tokens por minuto (entrada + saída
// pedida) e o direcionamento + estado atual já ocupam ~3K. Os números que a IA erra ao calcular (desvio do plano,
// pace de cada metade, deriva de FC, % por zona) são calculados AQUI e enviados prontos; só o que muda a leitura
// vai (voltas resumidas, plano do dia, últimas corridas parecidas). Pontos de GPS e série segundo a segundo não vão.
import { KIND_LABEL, WEEKDAY_SHORT, intensitySplit, shortDate, splitPercents, weekdayIndex, type Activity, type Physiology, type Planned } from "../domain.ts";
import { isStationary, paceSecPerKm, readLaps, type Lap, type LapGroup } from "../laps.ts";
import { estimateTokens } from "./directive.ts";

/** Versão do formato enviado; sobe quando muda o que vai à IA, para comparar análises antigas e novas. */
export const FEEDBACK_VERSION = 1;
/** Teto de tokens estimados do bloco de dados do treino (o restante do orçamento é do direcionamento e do estado). */
export const MAX_PAYLOAD_TOKENS = 1100;
/** Saída pedida. No Groq (gpt-oss) o app soma mais 2.048 de folga de raciocínio, e isso conta no limite por minuto. */
export const FEEDBACK_MAX_TOKENS = 700;

export type SimilarRun = { date: string; distanceM: number | null; durationS: number; avgHr: number | null };
export type FeedbackInput = {
  activity: Activity;
  plan?: Planned | null;
  phys: Physiology;
  laps: Lap[] | null;
  similar: SimilarRun[];
};

const f1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtPace = (s: number | null) => (s == null || !Number.isFinite(s) ? "—" : `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}/km`);
const fmtDur = (s: number) => {
  const t = Math.round(s);
  return t >= 3600 ? `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}min` : `${Math.floor(t / 60)}min${String(t % 60).padStart(2, "0")}s`;
};
const kmOf = (m: number | null) => (m == null ? null : m / 1000);
const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Tempo de pace de uma volta: em movimento quando houver (a pausa automática do relógio não conta). */
const lapTime = (l: Lap) => (l.movingS && l.movingS > 0 && l.movingS <= l.elapsedS ? l.movingS : l.elapsedS);

function wavg(ls: Lap[], f: (l: Lap) => number | null): number | null {
  let s = 0, w = 0;
  for (const l of ls) { const v = f(l); if (v != null) { s += v * l.elapsedS; w += l.elapsedS; } }
  return w > 0 ? s / w : null;
}
const paceOf = (ls: Lap[]): number | null => {
  const m = ls.filter((l) => !isStationary(l) && l.distanceM > 0);
  const d = m.reduce((s, l) => s + l.distanceM, 0);
  return d > 0 ? m.reduce((s, l) => s + lapTime(l), 0) / (d / 1000) : null;
};

/** Divide as voltas em duas metades pela distância acumulada (a volta que cruza o meio fica na primeira). */
export function halves(laps: Lap[]): [Lap[], Lap[]] {
  const total = laps.reduce((s, l) => s + l.distanceM, 0);
  let acc = 0;
  const a: Lap[] = [], b: Lap[] = [];
  for (const l of laps) { (acc < total / 2 ? a : b).push(l); acc += l.distanceM; }
  return [a, b];
}

/** Agrupa voltas consecutivas em no máximo `max` blocos, para corrida longa não virar 40 linhas. */
export function blocks(laps: Lap[], max: number): Lap[][] {
  const size = Math.ceil(laps.length / max);
  const out: Lap[][] = [];
  for (let i = 0; i < laps.length; i += size) out.push(laps.slice(i, i + size));
  return out;
}

const kmRange = (ls: Lap[], from: number) => {
  const d = ls.reduce((s, l) => s + l.distanceM, 0) / 1000;
  return `${f1(from)}–${f1(from + d)} km`;
};

function groupLine(title: string, g: LapGroup): string {
  const dist = g.stationary ? `${Math.round(g.avgElapsedS)} s parado` : g.avgDistanceM >= 1000 ? `${f1(g.avgDistanceM / 1000)} km` : `${Math.round(g.avgDistanceM / 10) * 10} m`;
  return `${title}: ${g.count} × ${dist}${g.paceS != null ? `, pace ${fmtPace(g.paceS)}` : ""}${g.bestPaceS != null && g.worstPaceS != null && g.count > 1 ? ` (${fmtPace(g.bestPaceS)} a ${fmtPace(g.worstPaceS)})` : ""}${g.avgHr != null ? `, FC ${g.avgHr}${g.maxHr != null ? ` (máx ${g.maxHr})` : ""}` : ""}`;
}

/** Linhas sobre as voltas. `detail` false pula a lista (modo compacto, quando o bloco estoura o orçamento). */
function lapLines(laps: Lap[], detail: boolean): string[] {
  const L: string[] = [];
  const reading = readLaps(laps);
  const moving = laps.filter((l) => !isStationary(l) && l.distanceM > 0);
  if (reading.kind === "intervalado" && reading.work) {
    L.push(`Voltas: ${laps.length}; lido como INTERVALADO.`);
    const warm = laps.filter((_, i) => reading.roles[i] === "aquecimento");
    const cool = laps.filter((_, i) => reading.roles[i] === "desaquecimento");
    if (warm.length) L.push(`Aquecimento: ${f1(warm.reduce((s, l) => s + l.distanceM, 0) / 1000)} km, pace ${fmtPace(paceOf(warm))}, FC ${Math.round(wavg(warm, (l) => l.avgHr) ?? 0) || "—"}`);
    L.push(groupLine("Tiros", reading.work));
    if (reading.rest) L.push(groupLine("Recuperações", reading.rest));
    if (cool.length) L.push(`Desaquecimento: ${f1(cool.reduce((s, l) => s + l.distanceM, 0) / 1000)} km, pace ${fmtPace(paceOf(cool))}, FC ${Math.round(wavg(cool, (l) => l.avgHr) ?? 0) || "—"}`);
    if (detail) {
      const work = laps.filter((_, i) => reading.roles[i] === "tiro");
      if (work.length <= 12) L.push(`Pace de cada tiro: ${work.map((l) => fmtPace(paceSecPerKm(l)).replace("/km", "")).join(", ")}; FC média de cada: ${work.map((l) => l.avgHr ?? "—").join(", ")}`);
    }
    return L;
  }
  L.push(`Voltas: ${laps.length}; lido como CONTÍNUO.`);
  if (moving.length >= 4) {
    const [h1, h2] = halves(moving);
    const p1 = paceOf(h1), p2 = paceOf(h2), hr1 = wavg(h1, (l) => l.avgHr), hr2 = wavg(h2, (l) => l.avgHr);
    if (p1 != null && p2 != null) {
      const d = Math.round(p2 - p1);
      L.push(`1ª metade: pace ${fmtPace(p1)}${hr1 != null ? `, FC ${Math.round(hr1)}` : ""}; 2ª metade: pace ${fmtPace(p2)}${hr2 != null ? `, FC ${Math.round(hr2)}` : ""} (${d === 0 ? "mesmo ritmo" : d < 0 ? `negative split, ${-d} s/km mais rápida` : `positive split, ${d} s/km mais lenta`}${hr1 != null && hr2 != null ? `; FC ${sign(Math.round(hr2 - hr1))} bpm entre as metades` : ""}).`);
    }
  }
  if (detail) {
    if (laps.length <= 12) {
      L.push("Voltas (distância, tempo, pace, FC): " + laps.map((l, i) => `${i + 1}) ${l.distanceM >= 1000 ? `${f1(l.distanceM / 1000)} km` : `${Math.round(l.distanceM)} m`} ${fmtDur(l.elapsedS)} ${fmtPace(paceSecPerKm(l))}${l.avgHr != null ? ` FC ${l.avgHr}` : ""}`).join("; "));
    } else {
      let from = 0;
      const rows = blocks(laps, 8).map((b) => {
        const r = `${kmRange(b, from)}: pace ${fmtPace(paceOf(b))}${wavg(b, (l) => l.avgHr) != null ? `, FC ${Math.round(wavg(b, (l) => l.avgHr)!)}` : ""}`;
        from += b.reduce((s, l) => s + l.distanceM, 0) / 1000;
        return r;
      });
      L.push("Por trechos: " + rows.join("; "));
    }
  }
  return L;
}

/**
 * Texto com os dados do treino. `compact` corta a lista de voltas. Os desvios em relação ao plano e a divisão por
 * zona saem prontos (a IA não faz conta). Só dados do atleta deste treino; nada de outro atleta entra aqui.
 */
export function formatRunData(i: FeedbackInput, compact = false): string {
  const { activity: a, plan, phys } = i;
  const L: string[] = [];
  const dk = kmOf(a.distanceM);
  L.push(`TREINO REALIZADO (${WEEKDAY_SHORT[weekdayIndex(a.date)]} ${shortDate(a.date)}/${a.date.slice(0, 4)}, ${KIND_LABEL[a.kind]}${a.kindInferred ? " — tipo inferido do plano" : ""}, fonte ${a.source})`);
  L.push(`Distância ${dk != null ? `${f1(dk)} km` : "não registrada"}; tempo ${fmtDur(a.durationS)}${dk ? `; pace médio ${fmtPace(a.durationS / dk)}` : ""}${a.elevGainM != null ? `; ganho de elevação ${Math.round(a.elevGainM)} m` : ""}.`);
  L.push(`FC média ${a.avgHr ?? "—"}${a.maxHr != null ? `, máxima ${a.maxHr}` : ""}. Referências do atleta: LV1 ${phys.lv1}, LV2 ${phys.lv2}, forte a partir de ${phys.hardFrom}, alvo dos leves < ${phys.easyTarget}, dos longos < ${phys.longTarget}.`);

  const split = a.hrZones?.length ? intensitySplit(a.hrZones, phys) : null;
  const p = split ? splitPercents(split) : null;
  if (split && p) L.push(`Tempo por intensidade (pela FC): ${p.easy}% leve (${fmtDur(split.easy)}), ${p.moderate}% moderado (${fmtDur(split.moderate)}), ${p.hard}% forte (${fmtDur(split.hard)}).`);
  else L.push("Tempo por zona de FC: não disponível neste treino.");

  // Comparação com o prescrito, já calculada.
  if (plan) {
    const parts: string[] = [`${plan.title}${plan.optional ? " (opcional)" : ""}`];
    if (plan.targetDistanceM) parts.push(`distância ${f1(plan.targetDistanceM / 1000)} km${dk != null ? ` (realizado ${sign(pct(a.distanceM!, plan.targetDistanceM)!)}%)` : ""}`);
    if (plan.targetDurationS) parts.push(`duração ${fmtDur(plan.targetDurationS)} (realizado ${sign(pct(a.durationS, plan.targetDurationS)!)}%)`);
    if (plan.targetHrMax) parts.push(`FC alvo < ${plan.targetHrMax}${a.avgHr != null ? ` (média ${a.avgHr}: ${a.avgHr < plan.targetHrMax ? `${plan.targetHrMax - a.avgHr} bpm abaixo do teto` : `${a.avgHr - plan.targetHrMax} bpm ACIMA do teto`})` : ""}`);
    L.push(`PRESCRITO: ${parts.join("; ")}.${plan.notes ? ` Observação do treino: ${plan.notes.slice(0, 300)}` : ""}`);
  } else L.push("PRESCRITO: nenhum treino de corrida planejado neste dia (corrida extra ou plano não importado).");

  if (i.laps && i.laps.length) L.push(...lapLines(i.laps, !compact));
  else L.push("Voltas: não disponíveis (a corrida ainda não foi buscada no Strava ou não tem voltas).");

  if (i.similar.length) {
    L.push("ÚLTIMAS CORRIDAS PARECIDAS (para comparar): " + i.similar.map((s) => `${shortDate(s.date)} ${s.distanceM ? `${f1(s.distanceM / 1000)} km` : "?"} em ${fmtDur(s.durationS)}${s.distanceM ? ` (${fmtPace(s.durationS / (s.distanceM / 1000))})` : ""}${s.avgHr != null ? ` FC ${s.avgHr}` : ""}`).join("; ") + ".");
  }
  return L.join("\n");
}

/** Dados do treino dentro do orçamento: tenta completo e cai para o compacto se passar de MAX_PAYLOAD_TOKENS. */
export function buildRunPayload(i: FeedbackInput): { text: string; compact: boolean; tokens: number } {
  const full = formatRunData(i, false);
  if (estimateTokens(full) <= MAX_PAYLOAD_TOKENS) return { text: full, compact: false, tokens: estimateTokens(full) };
  const c = formatRunData(i, true);
  return { text: c, compact: true, tokens: estimateTokens(c) };
}

// ---------- Tarefa e resposta ----------

export const FEEDBACK_TASK = `Analise a corrida abaixo, que o atleta acabou de fazer, e devolva APENAS um JSON válido (sem texto fora dele, sem crases) neste formato:
{"resumo": "2 a 3 frases sobre como foi o treino em relação ao prescrito e à intensidade",
 "veredito": "dentro_do_plano" | "parcial" | "fora_do_plano" | "sem_plano",
 "intensidade": "adequada" | "acima_do_alvo" | "abaixo_do_alvo" | "indeterminada",
 "pontos_positivos": ["até 3 itens curtos"],
 "pontos_atencao": ["até 3 itens curtos, só se houver algo real"],
 "proximo_passo": "1 a 2 frases práticas para o próximo treino ou a recuperação",
 "levar_ao_treinador": "pergunta ou observação para o treinador, ou null"}
Regras: julgue a intensidade pela FC e pelos limiares informados, nunca pelo pace; use os números já calculados nos dados, sem refazer contas; considere terreno, subida e calor antes de acusar excesso; não invente dado que não está nos dados (se faltar, diga). Se não houver treino prescrito, use "sem_plano". Dor ou sintoma citado: oriente procurar profissional.`;

export const VEREDITOS = ["dentro_do_plano", "parcial", "fora_do_plano", "sem_plano"] as const;
export const INTENSIDADES = ["adequada", "acima_do_alvo", "abaixo_do_alvo", "indeterminada"] as const;
export type Veredito = (typeof VEREDITOS)[number];
export type IntensidadeAvaliada = (typeof INTENSIDADES)[number];

export type FeedbackStructured = {
  resumo: string;
  veredito: Veredito | null;
  intensidade: IntensidadeAvaliada | null;
  pontosPositivos: string[];
  pontosAtencao: string[];
  proximoPasso: string | null;
  levarAoTreinador: string | null;
};

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x, 240)).filter((x): x is string => x != null).slice(0, 3) : []);
const pick = <T extends string>(v: unknown, all: readonly T[]): T | null => (typeof v === "string" && (all as readonly string[]).includes(v) ? (v as T) : null);

/**
 * Lê a resposta da IA. Tolera cercas de código e texto antes ou depois do JSON (o Claude não tem modo JSON).
 * Devolve null se não houver JSON utilizável com ao menos o resumo; quem chama guarda o texto bruto do mesmo jeito.
 */
export function parseFeedback(raw: string): FeedbackStructured | null {
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let o: Record<string, unknown>;
  try { o = JSON.parse(raw.slice(a, b + 1)) as Record<string, unknown>; } catch { return null; }
  if (!o || typeof o !== "object") return null;
  const resumo = str(o.resumo, 800);
  if (!resumo) return null;
  return {
    resumo,
    veredito: pick(o.veredito, VEREDITOS),
    intensidade: pick(o.intensidade, INTENSIDADES),
    pontosPositivos: list(o.pontos_positivos),
    pontosAtencao: list(o.pontos_atencao),
    proximoPasso: str(o.proximo_passo, 500),
    levarAoTreinador: str(o.levar_ao_treinador, 400),
  };
}
