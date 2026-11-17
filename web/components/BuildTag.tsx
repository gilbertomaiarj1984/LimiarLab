/** Sinal discreto de qual versão está no ar: PR e commit da imagem (definidos no build; vazio em desenvolvimento). */
export default function BuildTag() {
  const sha = (process.env.APP_COMMIT ?? "").slice(0, 7);
  const pr = (process.env.APP_PR ?? "").replace(/\D/g, "");
  if (!sha && !pr) return null;
  return <p className="buildtag" aria-label="Versão no ar">no ar: {pr ? `PR #${pr} · ` : ""}{sha}</p>;
}
