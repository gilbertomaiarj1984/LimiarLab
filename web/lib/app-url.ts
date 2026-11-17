/** Endereço público do app (atrás do Caddy o host da requisição é o interno). */
export function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  return `${base}${path}`;
}
