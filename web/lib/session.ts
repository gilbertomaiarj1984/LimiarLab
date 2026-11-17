// Sessão simples por senha única (fase 1, sem login de usuários).
// O cookie guarda a validade assinada com HMAC-SHA256; trocar SESSION_SECRET derruba todas as sessões.
// Usa só Web Crypto, para funcionar no proxy.ts e nas rotas.

export const SESSION_COOKIE = "ll_sessao";
export const SESSION_DAYS = 180;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

/** Comparação em tempo constante para strings do mesmo tamanho. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `v1.${exp}.${await hmac(secret, `v1.${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d{13,}$/.test(parts[1])) return false;
  if (Number(parts[1]) < now) return false;
  return safeEqual(parts[2], await hmac(secret, `v1.${parts[1]}`));
}

/** Compara a senha digitada com a configurada sem vazar o tamanho por tempo de resposta. */
export async function passwordMatches(input: string, expected: string, secret: string): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([hmac(secret, `pw:${input}`), hmac(secret, `pw:${expected}`)]);
  return safeEqual(a, b);
}

/** Token de importação (Authorization: Bearer ...). */
export async function bearerMatches(header: string | null, expected: string | undefined): Promise<boolean> {
  if (!expected || expected.length < 32 || !header?.startsWith("Bearer ")) return false;
  const got = header.slice(7).trim();
  const key = crypto.getRandomValues(new Uint8Array(32));
  const k = b64url(key);
  const [a, b] = await Promise.all([hmac(k, got), hmac(k, expected)]);
  return safeEqual(a, b);
}
