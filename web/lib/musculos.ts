// Mapa de calor dos músculos trabalhados no treino de força, a partir do histórico confirmado (strength_logs).
// Conta "séries por músculo": série feita vale 1 para o músculo principal do exercício e 0,5 para o secundário
// (contagem fracionada, convenção usada em estudos de dose-resposta de volume). Os grupos vêm da base de
// equivalência (data/equivalencias.json). Sem banco: recebe os registros prontos (testável).
import data from "./equivalencias-data.json" with { type: "json" };
import type { RegistroForca } from "./forca.ts";

export const REGIOES = [
  // frente
  "peito", "ombros", "biceps", "antebraco", "abdomen", "obliquos", "quadriceps", "adutores",
  // costas
  "trapezio", "meio-costas", "dorsais", "ombro-posterior", "triceps", "lombar", "gluteo", "gluteo-medio", "posteriores", "panturrilha", "soleo",
] as const;
export type Regiao = (typeof REGIOES)[number];

export const NOME_REGIAO: Record<Regiao, string> = {
  peito: "Peito", ombros: "Ombros (frente e lateral)", biceps: "Bíceps", antebraco: "Antebraço", abdomen: "Abdômen", obliquos: "Oblíquos",
  quadriceps: "Quadríceps", adutores: "Adutores", trapezio: "Trapézio", "meio-costas": "Meio das costas", dorsais: "Dorsais",
  "ombro-posterior": "Ombro posterior", triceps: "Tríceps", lombar: "Lombar", gluteo: "Glúteo", "gluteo-medio": "Glúteo médio",
  posteriores: "Posteriores da coxa", panturrilha: "Panturrilha", soleo: "Sóleo",
};

/** Grupo muscular da base → região do desenho. Grupos sem região (ex.: pé) ficam de fora. */
const GRUPO_REGIAO: Record<string, Regiao> = {
  peitoral: "peito", "peitoral-superior": "peito", "peitoral-inferior": "peito",
  "deltoide-anterior": "ombros", "deltoide-lateral": "ombros", deltoide: "ombros", ombro: "ombros",
  biceps: "biceps", braquial: "biceps", braquiorradial: "antebraco", antebraco: "antebraco", "extensores-punho": "antebraco",
  "reto-abdominal": "abdomen", "transverso-abdominal": "abdomen", core: "abdomen", obliquos: "obliquos",
  quadriceps: "quadriceps", "flexores-quadril": "quadriceps", adutores: "adutores",
  trapezio: "trapezio", "trapezio-superior": "trapezio", "trapezio-medio": "meio-costas", "trapezio-inferior": "meio-costas", romboides: "meio-costas",
  dorsais: "dorsais", "deltoide-posterior": "ombro-posterior", "manguito-rotador": "ombro-posterior",
  triceps: "triceps", "triceps-cabeca-longa": "triceps", "eretores-da-espinha": "lombar", "quadrado-lombar": "lombar",
  gluteo: "gluteo", "gluteo-medio": "gluteo-medio", isquiotibiais: "posteriores",
  panturrilha: "panturrilha", soleo: "soleo", "tendao-de-aquiles": "soleo",
};

type Ex = { id: string; grupo_primario?: string[]; grupo_secundario?: string[] | null };
const EX = new Map<string, Ex>((data.exercicios as Ex[]).map((e) => [e.id, e]));

/** Peso de cada região para um exercício da base: 1 (principal) ou 0,5 (secundário). */
export function pesos(id: string): Partial<Record<Regiao, number>> {
  const e = EX.get(id);
  const out: Partial<Record<Regiao, number>> = {};
  if (!e) return out;
  for (const g of e.grupo_secundario ?? []) { const r = GRUPO_REGIAO[g]; if (r) out[r] = Math.max(out[r] ?? 0, 0.5); }
  for (const g of e.grupo_primario ?? []) { const r = GRUPO_REGIAO[g]; if (r) out[r] = 1; }
  return out;
}

export type Mapa = {
  /** Séries por região no período. */
  series: Record<Regiao, number>;
  /** Exercícios que contribuíram para cada região (nome → séries), para o detalhe. */
  exercicios: Record<Regiao, { nome: string; series: number }[]>;
  sessoes: number;
  /** Exercícios feitos sem cadastro na base (não entram no mapa). */
  semMapa: string[];
};

export function mapaMuscular(registros: RegistroForca[]): Mapa {
  const series = Object.fromEntries(REGIOES.map((r) => [r, 0])) as Record<Regiao, number>;
  const ex = Object.fromEntries(REGIOES.map((r) => [r, new Map<string, number>()])) as Record<Regiao, Map<string, number>>;
  const semMapa = new Set<string>();
  for (const reg of registros) {
    for (const it of reg.itens) {
      if (it.series_feitas <= 0) continue;
      const p = it.id ? pesos(it.id) : {};
      if (!Object.keys(p).length) { semMapa.add(it.nome); continue; }
      for (const [r, w] of Object.entries(p) as [Regiao, number][]) {
        series[r] += it.series_feitas * w;
        ex[r].set(it.nome, (ex[r].get(it.nome) ?? 0) + it.series_feitas * w);
      }
    }
  }
  const exercicios = Object.fromEntries(REGIOES.map((r) => [r, [...ex[r]].map(([nome, s]) => ({ nome, series: s })).sort((a, b) => b.series - a.series)])) as Mapa["exercicios"];
  return { series, exercicios, sessoes: registros.length, semMapa: [...semMapa] };
}

/** Faixa de cor pelas séries por semana: 0 nada, 1 até 3, 2 de 3 a 6, 3 de 6 a 10, 4 de 10 para cima. */
export function faixa(seriesPorSemana: number): 0 | 1 | 2 | 3 | 4 {
  if (seriesPorSemana <= 0) return 0;
  if (seriesPorSemana < 3) return 1;
  if (seriesPorSemana < 6) return 2;
  if (seriesPorSemana < 10) return 3;
  return 4;
}

// ---------- Volume semanal por músculo ----------

/**
 * Referências de séries por semana (cautelosas, não são prescrição):
 * - abaixo de 4: pouco estímulo para ganho (meta-análise de dose-resposta: Schoenfeld, Ogborn e Krieger, 2017,
 *   J Sports Sci, viu ganho crescente com o volume e menor abaixo de 5 séries semanais);
 * - 10 ou mais: faixa associada a mais hipertrofia no mesmo estudo;
 * - acima de 20: retorno pequeno e mais fadiga, o que pesa para quem também corre (referência prática, sem corte firme na literatura).
 */
export const VOLUME_REF = { pouco: 4, alvo: 10, excesso: 20 } as const;

/** Músculos do foco do atleta (pernas para corrida longa); alerta de falta só para eles. */
export const FOCO: Regiao[] = ["quadriceps", "gluteo", "gluteo-medio", "posteriores", "panturrilha", "soleo"];

export type Alerta = { regiao: Regiao; tipo: "pouco" | "excesso"; series: number };

/** Alertas de uma semana completa: pouco volume nos músculos do foco e excesso em qualquer um. */
export function alertas(series: Record<Regiao, number>): Alerta[] {
  const out: Alerta[] = [];
  for (const r of REGIOES) {
    if (series[r] > VOLUME_REF.excesso) out.push({ regiao: r, tipo: "excesso", series: series[r] });
    else if (FOCO.includes(r) && series[r] < VOLUME_REF.pouco) out.push({ regiao: r, tipo: "pouco", series: series[r] });
  }
  return out;
}

/** Séries por região em cada semana (semanas começam na segunda; `inicios` em ordem). */
export function volumeSemanal(inicios: string[], registros: RegistroForca[]): { inicio: string; series: Record<Regiao, number> }[] {
  return inicios.map((ini, i) => {
    const fim = inicios[i + 1];
    const daSemana = registros.filter((r) => r.data >= ini && (!fim || r.data < fim) && r.data < addSete(ini));
    return { inicio: ini, series: mapaMuscular(daSemana).series };
  });
}

function addSete(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
