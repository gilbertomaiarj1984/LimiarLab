// Formatação em pt-BR. Funções puras.

export function km(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Duração curta para totais: "52 min", "2h27". */
export function hm(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

/** Duração de uma sessão: "48:23" ou "5h54". */
export function clock(seconds: number): string {
  const t = Math.round(seconds);
  if (t >= 3600) return `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** Pace "5:49/km". */
export function pace(seconds: number, meters: number): string {
  if (meters <= 0) return "";
  const p = Math.round(seconds / (meters / 1000));
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}/km`;
}
