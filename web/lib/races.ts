// Provas e metas: como cada prova entra no plano. Funções puras (testadas em races.test.ts).
// Prioridade: A = prova-alvo (polimento completo), B = no caminho (mini-polimento), C = treino.
import { addDays, shortDate, weekdayIndex, WEEKDAY_SHORT } from "./domain.ts";

export type Priority = "A" | "B" | "C";
export type Race = {
  id: string;
  date: string;
  name: string;
  distanceM: number;
  elevGainM: number | null;
  priority: Priority;
  goalTimeS: number | null;
  notes: string | null;
  source: string;
};
export type RaceNote = { date: string; raceId: string; kind: "semana" | "pernas" | "intensidade" | "vespera" | "prova" | "recuperacao" | "polimento"; text: string };

export const PRIORITY_LABEL: Record<Priority, string> = { A: "Prova-alvo", B: "No caminho", C: "Como treino" };

/** Dias de recuperação depois da prova (prática comum; não há estudo que fixe esse número). */
export function recoveryDays(r: Pick<Race, "distanceM" | "priority">): number {
  if (r.priority === "C") return 1;
  const km = r.distanceM / 1000;
  if (km <= 10.5) return 2;
  if (km <= 21.5) return 3;
  if (km <= 43) return 7;
  return 14;
}

const day = (iso: string) => `${WEEKDAY_SHORT[weekdayIndex(iso)]} ${shortDate(iso)}`;

/**
 * Orientações por dia em volta da prova. Fontes em docs/evidencias.md:
 * - A: polimento de ~2 semanas, volume 41–60% menor, intensidade e frequência mantidas (Bosquet et al., 2007).
 * - B: mini-polimento de uma semana, adaptado da mesma lógica (prática comum, sem estudo específico).
 * - C: a prova substitui a sessão de qualidade; só véspera e dia seguinte leves.
 */
export function raceNotes(r: Race): RaceNote[] {
  const d = (n: number) => addDays(r.date, n);
  const n = (offset: number, kind: RaceNote["kind"], text: string): RaceNote => ({ date: d(offset), raceId: r.id, kind, text });
  const name = `${r.name} (${day(r.date)})`;
  const out: RaceNote[] = [];
  if (r.priority === "A") {
    out.push(n(-14, "polimento", `Início do polimento para ${name}: corrida 40–60% menor até a prova, mantendo a intensidade e o número de treinos.`));
    out.push(n(-10, "pernas", "Último treino pesado de pernas antes da prova-alvo. Daqui em diante, força só leve."));
    out.push(n(-4, "pernas", "Sem musculação de pernas até a prova."));
    out.push(n(-3, "intensidade", "Último estímulo de intensidade: curto, no ritmo de prova."));
  } else if (r.priority === "B") {
    out.push(n(-6, "semana", `Semana de ${name}: corrida 20–30% menor que a média recente, sem treino novo. Força de pernas só na versão leve.`));
    out.push(n(-3, "pernas", "Sem musculação de pernas até a prova."));
    out.push(n(-3, "intensidade", "Se houver qualidade, que seja curta e até hoje."));
  }
  out.push(n(-1, "vespera", r.priority === "C"
    ? "Véspera de prova: dia leve."
    : "Véspera: descanso ou 20–30 min leve com 4 acelerações curtas. Sem longão: o longo da semana é a prova."));
  out.push(n(0, "prova", `Dia de prova: ${r.name}, ${fmtKm(r.distanceM)} km${r.priority === "C" ? ". Conta como a qualidade da semana" : ""}.`));
  const rec = recoveryDays(r);
  out.push(n(1, "recuperacao", rec === 1
    ? "Dia seguinte leve."
    : `Recuperação até ${day(d(rec))}: só corrida leve (abaixo do alvo dos dias leves) ou descanso; sem pernas pesadas.`));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Notas que caem num dia, de todas as provas. */
export function notesForDay(date: string, races: Race[]): RaceNote[] {
  return races.flatMap(raceNotes).filter((x) => x.date === date);
}

/** Dias entre duas datas ISO (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}

export function countdown(today: string, date: string): string {
  const n = daysBetween(today, date);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n < 0) return `há ${-n} dias`;
  const w = Math.floor(n / 7), r = n % 7;
  return `em ${n} dias${w ? ` (${w} semana${w > 1 ? "s" : ""}${r ? ` e ${r} dia${r > 1 ? "s" : ""}` : ""})` : ""}`;
}

/** Tempo-alvo em ritmo por km. */
export function goalPace(r: Pick<Race, "goalTimeS" | "distanceM">): string | null {
  if (!r.goalTimeS || !r.distanceM) return null;
  const s = Math.round(r.goalTimeS / (r.distanceM / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}/km`;
}

function fmtKm(m: number) {
  return (m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
