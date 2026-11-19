// Registro do treino de força realizado: o que foi feito de fato, exercício por exercício, já com as trocas.
// Monta um retrato (nomes, séries, trocas) no momento da confirmação, para o histórico não mudar se o treino
// ou a base de equivalência mudarem depois. Sem banco: recebe os dados prontos (testável).
import { originalId, swapGroups } from "./equivalencias.ts";
import type { Workout } from "./import-schema.ts";

export type Situacao = "feito" | "parcial" | "nao_feito";

/** Por que um exercício foi trocado ou ficou incompleto (para a aderência e para a IA analisar depois). */
export const MOTIVOS = {
  ocupado: "Aparelho ocupado",
  sem_equipamento: "Sem o equipamento",
  dor: "Dor ou desconforto",
  cansaco: "Cansaço",
  tempo: "Falta de tempo",
  preferencia: "Preferência",
  outro: "Outro",
} as const;
export type Motivo = keyof typeof MOTIVOS;
export const isMotivo = (m: unknown): m is Motivo => typeof m === "string" && Object.hasOwn(MOTIVOS, m);

export type ItemFeito = {
  /** Posição do exercício no treino (1, 2, …). */
  ex: number;
  /** O que foi feito. */
  nome: string;
  /** Id na base de equivalência (null quando o exercício do plano não está na base). */
  id: string | null;
  /** O que estava no plano. */
  plano: { nome: string; id: string | null };
  trocado: boolean;
  series_plano: number;
  reps: string;
  series_feitas: number;
  situacao: Situacao;
  /** Motivo da troca ou do que ficou incompleto (null quando não informado ou não se aplica). */
  motivo: Motivo | null;
};

export type RegistroForca = {
  data: string;
  treino: string;
  titulo: string;
  itens: ItemFeito[];
  obs: string | null;
  /** PSE da sessão (0–10), opcional. */
  pse: number | null;
  confirmado_em: string;
};

/** Entrada da confirmação: por exercício, séries feitas e a troca usada (ou null = exercício do plano). */
export type Confirmacao = { ex: number; series: number; troca: { g: number; id: string } | null; motivo?: Motivo | null };

export class ConfirmacaoInvalida extends Error {}

export function situacao(feitas: number, plano: number): Situacao {
  return feitas <= 0 ? "nao_feito" : feitas >= plano ? "feito" : "parcial";
}

/** Valida a confirmação contra o treino e a base de equivalência e monta os itens do histórico. */
export function montarItens(slug: string, w: Workout, conf: Confirmacao[]): ItemFeito[] {
  const porEx = new Map<number, Confirmacao>();
  for (const c of conf) {
    if (!Number.isInteger(c.ex) || c.ex < 1 || c.ex > w.exercises.length) throw new ConfirmacaoInvalida(`exercício ${c.ex} não existe no treino`);
    if (porEx.has(c.ex)) throw new ConfirmacaoInvalida(`exercício ${c.ex} repetido`);
    porEx.set(c.ex, c);
  }
  return w.exercises.map((e, i) => {
    const ex = i + 1;
    const c = porEx.get(ex);
    if (!c) throw new ConfirmacaoInvalida(`falta o exercício ${ex}`);
    const plano = { nome: e.name, id: originalId(slug, ex) };
    let nome = e.name, id = plano.id, seriesPlano = e.sets, reps = e.reps, trocado = false;
    if (c.troca) {
      const grupo = swapGroups(slug, ex)[c.troca.g];
      const alt = grupo?.alternativas.find((a) => a.id === c.troca!.id);
      if (!alt) throw new ConfirmacaoInvalida(`troca do exercício ${ex} fora da base de equivalência`);
      plano.id = originalId(slug, ex, c.troca.g);
      nome = alt.nome; id = alt.id; seriesPlano = alt.series; reps = alt.reps; trocado = true;
    }
    if (!Number.isInteger(c.series) || c.series < 0 || c.series > 10) throw new ConfirmacaoInvalida(`séries do exercício ${ex} inválidas`);
    if (c.motivo != null && !isMotivo(c.motivo)) throw new ConfirmacaoInvalida(`motivo do exercício ${ex} inválido`);
    const feitas = c.series;
    const sit = situacao(feitas, seriesPlano);
    // Motivo só faz sentido para troca ou para o que não foi feito por inteiro.
    const motivo = c.motivo && (trocado || sit !== "feito") ? c.motivo : null;
    return { ex, nome, id, plano, trocado, series_plano: seriesPlano, reps, series_feitas: feitas, situacao: sit, motivo };
  });
}

export type ResumoExercicio = {
  nome: string; id: string | null;
  /** Sessões em que foi feito (feito ou parcial). */
  vezes: number;
  /** Quantas dessas vezes ele entrou no lugar de outro. */
  como_troca: number;
  /** Sessões em que estava no plano e foi trocado por outro. */
  trocado_por_outro: number;
  /** Sessões em que estava no plano e não foi feito. */
  nao_feito: number;
  series: number;
  ultima: string;
};

/** Resumo por exercício, para a prescrição levar em conta o que vem sendo feito e o que vem sendo trocado. */
export function resumo(registros: RegistroForca[]): ResumoExercicio[] {
  const m = new Map<string, ResumoExercicio>();
  const de = (nome: string, id: string | null) => {
    const k = id ?? `nome:${nome}`;
    let r = m.get(k);
    if (!r) m.set(k, (r = { nome, id, vezes: 0, como_troca: 0, trocado_por_outro: 0, nao_feito: 0, series: 0, ultima: "" }));
    return r;
  };
  for (const reg of registros) {
    for (const it of reg.itens) {
      if (it.trocado) de(it.plano.nome, it.plano.id).trocado_por_outro++;
      const r = de(it.nome, it.id);
      if (it.situacao === "nao_feito") { r.nao_feito++; continue; }
      r.vezes++; r.series += it.series_feitas;
      if (it.trocado) r.como_troca++;
      if (reg.data > r.ultima) r.ultima = reg.data;
    }
  }
  return [...m.values()].sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome));
}

// ---------- Aderência ----------

export type SessaoPrevista = { data: string; treino: string; titulo: string; realizado: boolean };

export type Aderencia = {
  /** Treinos de força com treino detalhado previstos até hoje. */
  previstos: number;
  /** Feitos: registrados pelo relógio ou confirmados. */
  feitos: number;
  confirmados: number;
  /** Séries: planejadas (nos confirmados) e feitas. */
  series: { plano: number; feitas: number };
  exercicios: { feito: number; parcial: number; nao_feito: number; trocados: number };
  trocas: { de: string; para: string; vezes: number; motivos: Partial<Record<Motivo, number>> }[];
  incompletos: { nome: string; vezes: number; motivos: Partial<Record<Motivo, number>> }[];
  motivos: Partial<Record<Motivo, number>>;
  pendentes: SessaoPrevista[];
};

export function aderencia(previstas: SessaoPrevista[], registros: RegistroForca[]): Aderencia {
  const conf = (s: SessaoPrevista) => registros.some((r) => r.data === s.data && r.treino === s.treino);
  const out: Aderencia = {
    previstos: previstas.length,
    feitos: previstas.filter((s) => s.realizado || conf(s)).length,
    confirmados: registros.length,
    series: { plano: 0, feitas: 0 },
    exercicios: { feito: 0, parcial: 0, nao_feito: 0, trocados: 0 },
    trocas: [], incompletos: [], motivos: {},
    pendentes: previstas.filter((s) => s.realizado && !conf(s)),
  };
  const trocas = new Map<string, Aderencia["trocas"][number]>();
  const inc = new Map<string, Aderencia["incompletos"][number]>();
  const conta = (m: Partial<Record<Motivo, number>>, k: Motivo | null) => { if (k) m[k] = (m[k] ?? 0) + 1; };
  for (const r of registros) {
    for (const it of r.itens) {
      out.series.plano += it.series_plano;
      out.series.feitas += Math.min(it.series_feitas, it.series_plano);
      out.exercicios[it.situacao]++;
      conta(out.motivos, it.motivo);
      if (it.trocado) {
        out.exercicios.trocados++;
        const k = `${it.plano.nome}→${it.nome}`;
        const t = trocas.get(k) ?? { de: it.plano.nome, para: it.nome, vezes: 0, motivos: {} };
        t.vezes++; conta(t.motivos, it.motivo); trocas.set(k, t);
      }
      if (it.situacao !== "feito") {
        const i = inc.get(it.nome) ?? { nome: it.nome, vezes: 0, motivos: {} };
        i.vezes++; if (!it.trocado) conta(i.motivos, it.motivo); inc.set(it.nome, i);
      }
    }
  }
  out.trocas = [...trocas.values()].sort((a, b) => b.vezes - a.vezes);
  out.incompletos = [...inc.values()].sort((a, b) => b.vezes - a.vezes);
  return out;
}
