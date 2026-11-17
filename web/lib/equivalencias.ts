// Trocas de exercício: dados de data/equivalencias.json (cópia em equivalencias-data.json, gerada por scripts/equivalencias.py)
// montados por exercício do treino, para a tela de acompanhamento. Sem estado: tudo sai do arquivo.
import data from "./equivalencias-data.json" with { type: "json" };
import { FIGURES } from "./figures.ts";

type Fig = { viewBox: string; label: string; body: string };
type Ex = {
  id: string; nome: string; equipamento: string[]; unilateral?: boolean; impacto: number; fadiga: string;
  grupo_primario?: string[]; ilustracao?: string | null; dicas?: string[];
};
type Sub = { id: string; equivalencia: "alta" | "media" | "baixa"; ajuste?: string; quando?: string; atencao?: string | null; evidencia?: string };
type Slot = { treino: string; ordem: number; original: string; objetivo: string; criterios?: string; substitutos: Sub[]; evitar?: { id: string; porque: string }[] };

const EX = new Map<string, Ex>((data.exercicios as Ex[]).map((e) => [e.id, e]));
const SLOTS = data.slots as Slot[];

export type SwapAlt = {
  id: string; nome: string; equivalencia: Sub["equivalencia"]; equipamento: string[]; foco: string;
  ajuste: string | null; quando: string | null; atencao: string | null; evidencia: string | null; dicas: string[]; figure: Fig | null;
};
export type SwapGroup = { original: string; objetivo: string; criterios: string | null; alternativas: SwapAlt[]; evitar: { nome: string; porque: string }[] };

export function figureOf(ex: Ex | undefined): Fig | null {
  const key = ex?.ilustracao?.replace(/^assets\/svg\//, "").replace(/\.svg$/, "");
  return key ? FIGURES[key] ?? null : null;
}

const GRUPOS: Record<string, string> = {
  quadriceps: "Quadríceps", gluteo: "Glúteo", "gluteo-medio": "Glúteo médio", isquiotibiais: "Posteriores", soleo: "Sóleo", panturrilha: "Panturrilha",
  dorsais: "Costas (dorsal)", peitoral: "Peito", "peitoral-superior": "Peito (superior)", "peitoral-inferior": "Peito (inferior)", deltoide: "Ombros",
  "deltoide-anterior": "Ombro (anterior)", "deltoide-lateral": "Ombro (lateral)", "deltoide-posterior": "Ombro posterior", biceps: "Bíceps", triceps: "Tríceps",
  "triceps-cabeca-longa": "Tríceps", antebraco: "Antebraço", braquial: "Braquial", braquiorradial: "Braquiorradial", trapezio: "Trapézio",
  "trapezio-inferior": "Trapézio", "trapezio-medio": "Trapézio", "trapezio-superior": "Trapézio", romboides: "Romboides", obliquos: "Oblíquos",
  "reto-abdominal": "Abdômen", "transverso-abdominal": "Abdômen profundo", core: "Core", "eretores-da-espinha": "Lombar", "quadrado-lombar": "Core lateral",
  adutores: "Adutores", "flexores-quadril": "Flexores do quadril", "tendao-de-aquiles": "Tendão de Aquiles", pe: "Pé", ombro: "Ombro",
  "manguito-rotador": "Manguito rotador", "extensores-punho": "Antebraço",
};
const grupos = (g: string[]) => [...new Set(g.map((x) => GRUPOS[x] ?? x))].slice(0, 2).join(", ");

const nome = (id: string) => EX.get(id)?.nome ?? id;

/** Trocas do exercício `ordem` (1, 2, …) do treino `slug`. Vazio se o treino não está na base. */
export function swapGroups(slug: string, ordem: number): SwapGroup[] {
  return SLOTS.filter((s) => s.treino === slug && s.ordem === ordem).map((s) => ({
    original: nome(s.original),
    objetivo: s.objetivo,
    criterios: s.criterios ?? null,
    alternativas: s.substitutos.map((x) => {
      const e = EX.get(x.id);
      return {
        id: x.id, nome: nome(x.id), equivalencia: x.equivalencia, equipamento: e?.equipamento ?? [],
        foco: grupos(e?.grupo_primario ?? []),
        ajuste: x.ajuste ?? null, quando: x.quando ?? null, atencao: x.atencao ?? null, evidencia: x.evidencia ?? null,
        dicas: e?.dicas ?? [], figure: figureOf(e),
      };
    }),
    evitar: (s.evitar ?? []).map((v) => ({ nome: nome(v.id), porque: v.porque })),
  }));
}

/** Verificação usada nos testes: todo id resolve e todo substituto tem figura. */
export function checkData(): string[] {
  const erros: string[] = [];
  for (const s of SLOTS) {
    for (const id of [s.original, ...s.substitutos.map((x) => x.id), ...(s.evitar ?? []).map((x) => x.id)]) {
      if (!EX.has(id)) erros.push(`${s.treino}#${s.ordem}: id sem cadastro ${id}`);
    }
    for (const x of s.substitutos) if (!figureOf(EX.get(x.id))) erros.push(`${s.treino}#${s.ordem}: ${x.id} sem figura`);
  }
  return erros;
}
