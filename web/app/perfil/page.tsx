import { loadContext } from "@/lib/context";
import { lastImport, listAthletes } from "@/lib/repo";
import { localDate, localTime, shortDate } from "@/lib/domain";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

export default async function Perfil() {
  const { athlete, phys, today } = await loadContext();
  const [last, athletes] = await Promise.all([lastImport(athlete.id), listAthletes()]);
  const lastTxt = last
    ? `${localDate(last, athlete.timezone) === today ? "hoje" : shortDate(localDate(last, athlete.timezone))}, ${localTime(last, athlete.timezone)}`
    : "ainda não recebeu dados";
  return (
    <>
      <main className="view">
        <header>
          <p className="eyebrow">Perfil</p>
          <h1>{athlete.name}</h1>
          {athlete.goal && <p className="muted">{athlete.goal}</p>}
        </header>

        <section>
          <div className="sec-head"><h2>Fisiologia</h2><span>{phys.source} · {shortDate(phys.validFrom)}/{phys.validFrom.slice(0, 4)}</span></div>
          <div className="box">
            <dl className="kv">
              <dt>LV1 (fronteira do leve)</dt><dd>{phys.lv1} bpm</dd>
              <dt>LV2</dt><dd>{phys.lv2} bpm</dd>
              {phys.hrMax != null && <><dt>FC máxima medida</dt><dd>{phys.hrMax} bpm</dd></>}
              {phys.vo2max != null && <><dt>VO2máx medido</dt><dd>{phys.vo2max.toLocaleString("pt-BR")}</dd></>}
            </dl>
          </div>
        </section>

        <section>
          <div className="sec-head"><h2>Faixas usadas no app</h2><span>por FC, não por pace</span></div>
          <div className="panel scroll">
            <table className="tbl">
              <thead><tr><th>Faixa</th><th>FC</th><th>Uso</th></tr></thead>
              <tbody>
                <tr><td><span className="chip easy">leve</span></td><td>abaixo de {phys.lv1}</td><td>dias leves abaixo de {phys.easyTarget}</td></tr>
                <tr><td><span className="chip mod">moderado</span></td><td>{phys.lv1} a {phys.hardFrom - 1}</td><td>evitar como padrão</td></tr>
                <tr><td><span className="chip hard">forte</span></td><td>{phys.hardFrom} ou mais</td><td>1 a 2 sessões por semana</td></tr>
              </tbody>
            </table>
          </div>
          <p className="foot">Longo: a maior parte abaixo de {phys.longTarget} bpm.</p>
        </section>

        <section>
          <div className="sec-head"><h2>Conexões</h2></div>
          <div className="box">
            <div className="conn"><div><h3>Garmin Connect</h3><p className="muted small">Pela rotina do Claude. Última importação: {lastTxt}.</p></div><span className={`st ${last ? "ok" : "wait"}`}>{last ? "ativa" : "aguardando"}</span></div>
            <div className="conn"><div><h3>Strava</h3><p className="muted small">Realizados automáticos pela API oficial. Entra na fase 2.</p></div><button className="btn" type="button" disabled>Conectar</button></div>
          </div>
        </section>

        <section>
          <div className="sec-head"><h2>Atletas</h2><span>multiusuário</span></div>
          <div className="box">
            {athletes.map((a) => (
              <div key={a.id} className="conn"><div><h3>{a.name}</h3><p className="muted small">{a.id === athlete.id ? "em uso" : a.slug}</p></div><span className="st ok">ativo</span></div>
            ))}
            <div className="conn"><div><h3>Adicionar atleta</h3><p className="muted small">Chega com o login, na fase 3.</p></div><button className="btn" type="button" disabled>Convidar</button></div>
          </div>
        </section>
      </main>
      <TabBar current="/perfil" />
    </>
  );
}
