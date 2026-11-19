import Link from "next/link";
import { shortDate } from "@/lib/domain";
import { MOTIVOS, type Aderencia, type Motivo } from "@/lib/forca";
import { alertas, faixa, FOCO, NOME_REGIAO, REGIOES, VOLUME_REF, type Regiao } from "@/lib/musculos";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Tabela músculo × semana (4 semanas fechadas e a atual), com alertas da última semana fechada. */
export function VolumeSemanal({ semanas, atual }: { semanas: { inicio: string; series: Record<Regiao, number> }[]; atual: string }) {
  // Semana atual primeiro: no celular é a coluna que aparece sem rolar.
  const cols = [...semanas].reverse();
  const usadas = REGIOES.filter((r) => FOCO.includes(r) || semanas.some((w) => w.series[r] > 0));
  // Última semana fechada com algum treino confirmado (semana sem registro não é "pouco volume", é falta de dado).
  const fechada = [...semanas].reverse().find((w) => w.inicio < atual && REGIOES.some((r) => w.series[r] > 0));
  const alerta = fechada ? alertas(fechada.series) : [];
  const temDados = semanas.some((w) => REGIOES.some((r) => w.series[r] > 0));
  return (
    <>
      {!temDados && <p className="muted">Ainda sem treinos confirmados nestas semanas. A tabela enche conforme você confirma os treinos.</p>}
      {temDados && fechada && alerta.length > 0 && (
        <div className="note warn">
          Semana de {shortDate(fechada.inicio)}:{" "}
          {alerta.map((a, i) => (
            <span key={a.regiao}>{i ? "; " : ""}{NOME_REGIAO[a.regiao].toLowerCase()} com {fmt(a.series)} série{a.series === 1 ? "" : "s"} ({a.tipo === "pouco" ? `abaixo de ${VOLUME_REF.pouco}` : `acima de ${VOLUME_REF.excesso}`})</span>
          ))}.
        </div>
      )}
      <div className="scroll">
        <table className="tbl mvol">
          <thead><tr><th>Músculo</th>{cols.map((w) => <th key={w.inicio}>{shortDate(w.inicio)}{w.inicio === atual ? " *" : ""}</th>)}</tr></thead>
          <tbody>
            {usadas.map((r) => (
              <tr key={r}>
                <td>{NOME_REGIAO[r]}{FOCO.includes(r) ? " ●" : ""}</td>
                {cols.map((w) => <td key={w.inicio} className={`h${faixa(w.series[r])}`}>{w.series[r] ? fmt(w.series[r]) : "·"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="foot">
        * Semana em andamento. ● Músculos do foco (pernas para corrida longa): alerta quando ficam abaixo de {VOLUME_REF.pouco} séries numa semana fechada com treino confirmado.
        Referências: abaixo de 5 séries semanais o ganho tende a ser menor e 10 ou mais se associa a mais hipertrofia (Schoenfeld, Ogborn e Krieger, 2017, meta-análise);
        acima de {VOLUME_REF.excesso} o retorno é pequeno e a fadiga pesa na corrida (referência prática). Não é meta fixa: superiores, pela estética, podem ficar abaixo.
      </p>
    </>
  );
}

function Motivos({ m }: { m: Partial<Record<Motivo, number>> }) {
  const l = (Object.entries(m) as [Motivo, number][]).sort((a, b) => b[1] - a[1]);
  if (!l.length) return null;
  return <small>{l.map(([k, n]) => `${MOTIVOS[k].toLowerCase()}${n > 1 ? ` (${n})` : ""}`).join(", ")}</small>;
}

export function AderenciaPainel({ a }: { a: Aderencia }) {
  if (!a.previstos && !a.confirmados) return <p className="muted">Sem treinos de força previstos no período.</p>;
  const motivos = (Object.entries(a.motivos) as [Motivo, number][]).sort((x, y) => y[1] - x[1]);
  return (
    <div className="ader">
      <div className="tiles">
        <div className="tile"><span className="k">Treinos feitos</span><span className="v">{pct(a.feitos, a.previstos)}<small>%</small></span><span className="s">{a.feitos} de {a.previstos} previstos até hoje</span></div>
        <div className="tile"><span className="k">Confirmados</span><span className="v">{a.confirmados}</span><span className="s">com os exercícios registrados</span></div>
        <div className="tile"><span className="k">Séries feitas</span><span className="v">{pct(a.series.feitas, a.series.plano)}<small>%</small></span><span className="s">{a.series.feitas} de {a.series.plano} nos confirmados</span></div>
        <div className="tile"><span className="k">Exercícios trocados</span><span className="v">{a.exercicios.trocados}</span><span className="s">{a.exercicios.parcial} incompleto{a.exercicios.parcial === 1 ? "" : "s"} · {a.exercicios.nao_feito} não feito{a.exercicios.nao_feito === 1 ? "" : "s"}</span></div>
      </div>
      {a.pendentes.length > 0 && (
        <div className="note warn">
          Falta confirmar: {a.pendentes.map((p, i) => <span key={p.data + p.treino}>{i ? ", " : ""}<Link className="wk" href={`/treino/${p.treino}?dia=${p.data}#confirmar`}>{p.titulo} ({shortDate(p.data)})</Link></span>)}.
        </div>
      )}
      {a.trocas.length > 0 && (
        <>
          <h3>Trocas mais frequentes</h3>
          <ul className="bh-list">
            {a.trocas.slice(0, 6).map((t) => <li key={t.de + t.para}><i className="h2" /><span><b>{t.para}</b> no lugar de {t.de} · {t.vezes}×</span><Motivos m={t.motivos} /></li>)}
          </ul>
        </>
      )}
      {a.incompletos.length > 0 && (
        <>
          <h3>Ficaram pela metade ou de fora</h3>
          <ul className="bh-list">
            {a.incompletos.slice(0, 6).map((t) => <li key={t.nome}><i className="h3" /><span><b>{t.nome}</b> · {t.vezes}×</span><Motivos m={t.motivos} /></li>)}
          </ul>
        </>
      )}
      {motivos.length > 0 && <p className="small">Motivos informados: {motivos.map(([k, n]) => `${MOTIVOS[k].toLowerCase()} ${n}`).join(" · ")}.</p>}
    </div>
  );
}
