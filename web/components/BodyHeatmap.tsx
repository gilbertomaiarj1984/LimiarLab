import { faixa, NOME_REGIAO, REGIOES, type Mapa, type Regiao } from "@/lib/musculos";

// Corpo humano de frente e de costas, com cada região muscular pintada pelas séries por semana.
// Desenho esquemático (formas simples), lado esquerdo desenhado e espelhado no direito.

type Forma = { r: Regiao; d: string; mirror?: boolean };

const FRENTE: Forma[] = [
  { r: "ombros", d: "M78 62 Q60 62 56 80 Q55 92 60 96 Q70 84 80 76 Z", mirror: true },
  { r: "peito", d: "M98 68 L80 70 Q70 82 74 98 Q86 106 98 102 Z", mirror: true },
  { r: "biceps", d: "M58 98 Q52 112 54 128 Q60 132 66 126 Q68 110 64 98 Z", mirror: true },
  { r: "antebraco", d: "M53 134 Q47 152 48 170 Q53 174 57 170 Q62 152 63 134 Z", mirror: true },
  { r: "abdomen", d: "M88 108 L112 108 Q114 140 110 172 L90 172 Q86 140 88 108 Z" },
  { r: "obliquos", d: "M86 110 L76 106 Q72 140 80 170 L88 172 Q84 140 86 110 Z", mirror: true },
  { r: "quadriceps", d: "M80 186 Q72 222 78 262 Q86 268 94 262 Q98 228 96 196 Q88 186 80 186 Z", mirror: true },
  { r: "adutores", d: "M97 194 Q100 214 99 238 Q96 238 95 236 Q95 214 97 194 Z", mirror: true },
];

const COSTAS: Forma[] = [
  { r: "trapezio", d: "M100 48 L84 60 Q92 66 100 76 Q108 66 116 60 Z" },
  { r: "ombro-posterior", d: "M80 62 Q62 62 56 80 Q55 92 60 96 Q70 84 82 74 Z", mirror: true },
  { r: "meio-costas", d: "M100 78 Q92 68 86 66 L88 100 L100 110 L112 100 L114 66 Q108 68 100 78 Z" },
  { r: "dorsais", d: "M86 68 L76 84 Q74 120 88 146 L98 142 L98 112 L88 102 Z", mirror: true },
  { r: "triceps", d: "M58 98 Q52 112 54 128 Q60 132 66 126 Q68 110 64 98 Z", mirror: true },
  { r: "antebraco", d: "M53 134 Q47 152 48 170 Q53 174 57 170 Q62 152 63 134 Z", mirror: true },
  { r: "lombar", d: "M90 146 L110 146 L112 172 L88 172 Z" },
  { r: "gluteo-medio", d: "M70 172 Q68 184 76 190 L86 178 L86 172 Z", mirror: true },
  { r: "gluteo", d: "M98 176 L86 178 Q74 190 78 206 Q90 214 99 206 Z", mirror: true },
  { r: "posteriores", d: "M78 214 Q72 240 80 266 Q88 270 95 264 Q98 238 97 214 Q88 210 78 214 Z", mirror: true },
  { r: "panturrilha", d: "M80 282 Q72 300 78 322 Q85 326 94 320 Q98 300 94 282 Q87 278 80 282 Z", mirror: true },
  { r: "soleo", d: "M80 324 Q80 342 85 352 Q90 352 92 340 Q94 330 93 322 Q86 328 80 324 Z", mirror: true },
];

/** Silhueta neutra (cabeça, tronco, braços, pernas). */
function Silhueta() {
  return (
    <g className="bh-body">
      <circle cx="100" cy="28" r="17" />
      <rect x="92" y="42" width="16" height="16" rx="4" />
      <path d="M80 56 L120 56 Q142 60 144 82 L140 180 Q122 190 100 190 Q78 190 60 180 L56 82 Q58 60 80 56 Z" />
      <path d="M58 72 Q48 76 48 100 L44 172 Q46 184 52 186 Q60 184 60 172 L66 104 Z" />
      <path d="M142 72 Q152 76 152 100 L156 172 Q154 184 148 186 Q140 184 140 172 L134 104 Z" />
      <path d="M64 176 Q68 230 76 272 L78 372 Q78 384 90 384 Q96 382 94 372 L98 272 Q100 230 100 192 Z" />
      <path d="M136 176 Q132 230 124 272 L122 372 Q122 384 110 384 Q104 382 106 372 L102 272 Q100 230 100 192 Z" />
    </g>
  );
}

function Figura({ formas, titulo, mapa, semanas }: { formas: Forma[]; titulo: string; mapa: Mapa; semanas: number }) {
  return (
    <figure className="bh-fig">
      <svg viewBox="40 6 120 384" role="img" aria-label={`${titulo}: músculos trabalhados`}>
        <Silhueta />
        {formas.map((f, i) => {
          const s = mapa.series[f.r];
          const cls = `bh-m h${faixa(s / semanas)}`;
          const tip = `${NOME_REGIAO[f.r]}: ${fmt(s)} série${s === 1 ? "" : "s"}`;
          return (
            <g key={i}>
              <path className={cls} d={f.d}><title>{tip}</title></path>
              {f.mirror && <path className={cls} d={f.d} transform="translate(200 0) scale(-1 1)"><title>{tip}</title></path>}
            </g>
          );
        })}
      </svg>
      <figcaption>{titulo}</figcaption>
    </figure>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

export default function BodyHeatmap({ mapa, semanas }: { mapa: Mapa; semanas: number }) {
  const lista = REGIOES.map((r) => ({ r, s: mapa.series[r] })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const zerados = REGIOES.filter((r) => mapa.series[r] === 0);
  return (
    <div className="bh">
      <div className="bh-figs">
        <Figura formas={FRENTE} titulo="Frente" mapa={mapa} semanas={semanas} />
        <Figura formas={COSTAS} titulo="Costas" mapa={mapa} semanas={semanas} />
      </div>
      <div className="bh-key" aria-label="Legenda: séries por semana">
        <span>séries por semana</span>
        <i className="h0" /><small>0</small><i className="h1" /><small>1–2</small><i className="h2" /><small>3–5</small>
        <i className="h3" /><small>6–9</small><i className="h4" /><small>10+</small>
      </div>
      {lista.length > 0 && (
        <ul className="bh-list">
          {lista.map(({ r, s }) => (
            <li key={r}>
              <i className={`h${faixa(s / semanas)}`} />
              <span><b>{NOME_REGIAO[r]}</b> {fmt(s)} série{s === 1 ? "" : "s"}{semanas > 1 ? ` (${fmt(Math.round((s / semanas) * 10) / 10)}/sem)` : ""}</span>
              <small>{mapa.exercicios[r].slice(0, 3).map((e) => e.nome).join(", ")}</small>
            </li>
          ))}
        </ul>
      )}
      {lista.length > 0 && zerados.length > 0 && <p className="muted small">Sem séries no período: {zerados.map((r) => NOME_REGIAO[r].toLowerCase()).join(", ")}.</p>}
      {mapa.semMapa.length > 0 && <p className="muted small">Fora do mapa (exercício sem cadastro na base): {mapa.semMapa.join(", ")}.</p>}
    </div>
  );
}
