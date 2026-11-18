// Plano enxuto para o app do relógio (garmin/): os treinos de força dos próximos dias, já com as trocas
// de exercício aplicadas. Sem acesso a banco: recebe os dados prontos (testável).
import { addDays, shortDate, weekdayIndex, WEEKDAY_SHORT, type Planned } from "./domain.ts";
import { swapGroups } from "./equivalencias.ts";
import type { Workout } from "./import-schema.ts";

/** Dias para frente que o relógio guarda (hoje incluído). */
export const WATCH_DAYS = 7;

/** Exercício no formato do relógio (chaves curtas para caber na memória do relógio). */
export type WatchEx = {
  n: string; // nome
  s: number; // séries
  r: string; // repetições (ou tempo)
  c: string; // carga ("" quando não se aplica, ex.: exercício trocado)
  d: number; // descanso em segundos
  f: string; // foco
  t: string[]; // dicas
  g: string; // chave da ilustração ("" sem ilustração)
  o: string; // nome do original quando trocado ("" se não)
};
export type WatchSession = { data: string; rotulo: string; nome: string; slug: string; ex: WatchEx[] };
export type WatchPlan = { hoje: string; sessoes: WatchSession[] };
export type WatchSwap = { date: string; slug: string; ex: number; g: number; id: string };

/** Descanso padrão a partir de um texto como "60–90 s" (média arredondada a 15 s). */
export function midRest(rest: string | null | undefined): number {
  const n = (rest ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (!n.length) return 75;
  return n.length > 1 ? Math.round((n[0] + n[1]) / 2 / 15) * 15 : n[0];
}

/** Troca caracteres que a fonte do relógio pode não ter (travessões, aspas curvas, ≈). */
export function limpa(t: string): string {
  return t.replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/≈/g, "~").replace(/…/g, "...").replace(/\u00a0/g, " ");
}

/** "8-12" vira "8-12 reps"; textos como "10 por lado" ou "30 s" ficam como estão. */
export function repsText(reps: string): string {
  const r = limpa(reps.trim());
  return /[a-zà-ú]/i.test(r) ? r : `${r} reps`;
}

export function watchLabel(date: string, today: string): string {
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  return `${WEEKDAY_SHORT[weekdayIndex(date)]} ${shortDate(date)}`;
}

function exercises(w: Workout, slug: string, date: string, swaps: WatchSwap[]): WatchEx[] {
  const defRest = midRest(w.rest);
  return w.exercises.map((e, i) => {
    const rest = e.rest_s ?? defRest;
    const base: WatchEx = {
      n: limpa(e.name), s: e.sets, r: repsText(e.reps), c: limpa(e.load ?? ""), d: rest, f: limpa(e.focus ?? ""),
      t: (e.tips ?? []).map(limpa), g: e.figure ?? "", o: "",
    };
    const sw = swaps.find((x) => x.date === date && x.slug === slug && x.ex === i + 1);
    if (!sw) return base;
    const alt = swapGroups(slug, i + 1)[sw.g]?.alternativas.find((a) => a.id === sw.id);
    if (!alt) return base; // troca que não existe mais na base: fica o original
    return {
      n: limpa(alt.nome), s: alt.series, r: repsText(alt.reps), c: "", d: rest, f: limpa(alt.foco),
      t: alt.dicas.map(limpa), g: alt.figura ?? "", o: limpa(e.name),
    };
  });
}

/** Treinos de força com treino detalhado de `today` a `today + WATCH_DAYS - 1`, na ordem do plano. */
export function buildWatchPlan(today: string, planned: Planned[], workouts: Map<string, Workout>, swaps: WatchSwap[]): WatchPlan {
  const last = addDays(today, WATCH_DAYS - 1);
  const sessoes: WatchSession[] = [];
  for (const p of planned) {
    if (p.sport !== "strength" || !p.workout || p.date < today || p.date > last) continue;
    const w = workouts.get(p.workout);
    if (!w) continue;
    sessoes.push({ data: p.date, rotulo: watchLabel(p.date, today), nome: limpa(w.title.replace(/\s*\([^)]*\)\s*$/, "")), slug: p.workout, ex: exercises(w, p.workout, p.date, swaps) });
  }
  return { hoje: today, sessoes };
}
