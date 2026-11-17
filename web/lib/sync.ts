// Sincronização com o Strava: botão "Atualizar" e rotina diária das 9h. Só lê; nunca escreve no Strava.
import { sql, ensureSchema } from "./db";
import { applyImport, getAthlete, type Athlete } from "./repo";
import { localDate } from "./domain";
import { mapStravaActivity, sameInstant, type StravaActivity } from "./strava";
import type { ActivityIn } from "./import-schema";

const API = "https://www.strava.com/api/v3";
export const SYNC_HOUR = 9; // no fuso do atleta
const LOOKBACK_DAYS = 14;
/** Histórico completo: 2 anos (o Strava do atleta começa em 2024). Percorre as páginas até uma vir vazia (máx. 60). */
export const HISTORY_DAYS = 800;
const MAX_DAYS = 1500;
const FETCH_TIMEOUT_MS = 20_000;

export type Connection = {
  athleteId: string; accessToken: string; refreshToken: string; expiresAt: Date;
  lastSyncAt: Date | null; lastSyncError: string | null; lastAutoDate: string | null;
};

export function stravaConfigured(): boolean {
  return !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export async function getConnection(athleteId: string): Promise<Connection | null> {
  await ensureSchema();
  const [c] = await sql<Connection[]>`
    SELECT athlete_id AS "athleteId", access_token AS "accessToken", refresh_token AS "refreshToken",
           expires_at AS "expiresAt", last_sync_at AS "lastSyncAt", last_sync_error AS "lastSyncError",
           to_char(last_auto_date, 'YYYY-MM-DD') AS "lastAutoDate"
    FROM strava_connections WHERE athlete_id = ${athleteId}`;
  return c ?? null;
}

type TokenReply = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number } };

async function tokenRequest(params: Record<string, string>): Promise<TokenReply> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID ?? "", client_secret: process.env.STRAVA_CLIENT_SECRET ?? "", ...params }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Strava recusou o token (HTTP ${res.status})`);
  return (await res.json()) as TokenReply;
}

/** Troca o código do retorno do Strava por tokens e guarda. */
export async function saveConnectionFromCode(athleteId: string, code: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  if (!t.athlete?.id) throw new Error("Resposta do Strava sem atleta");
  await ensureSchema();
  await sql`
    INSERT INTO strava_connections (athlete_id, strava_athlete, access_token, refresh_token, expires_at)
    VALUES (${athleteId}, ${t.athlete.id}, ${t.access_token}, ${t.refresh_token}, to_timestamp(${t.expires_at}))
    ON CONFLICT (athlete_id) DO UPDATE SET strava_athlete = EXCLUDED.strava_athlete, access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token, expires_at = EXCLUDED.expires_at, last_sync_error = NULL`;
}

async function freshToken(c: Connection): Promise<string> {
  if (c.expiresAt.getTime() - Date.now() > 120_000) return c.accessToken;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: c.refreshToken });
  await sql`
    UPDATE strava_connections SET access_token = ${t.access_token}, refresh_token = ${t.refresh_token},
      expires_at = to_timestamp(${t.expires_at}) WHERE athlete_id = ${c.athleteId}`;
  return t.access_token;
}

/** Uma página por vez (a mais antiga primeiro): quem chama grava cada página, então uma falha no meio não perde o que já veio. */
async function* pages(token: string, afterEpoch: number, maxPages: number): AsyncGenerator<StravaActivity[]> {
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${API}/athlete/activities?after=${afterEpoch}&per_page=200&page=${page}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 401) throw new Error("Strava não autorizou a leitura. Conecte de novo.");
    if (res.status === 429) throw new Error("Limite de consultas do Strava. Tente em alguns minutos.");
    if (!res.ok) throw new Error(`Strava respondeu HTTP ${res.status}`);
    const list = (await res.json()) as StravaActivity[];
    // O Strava pode devolver páginas incompletas: só uma página vazia indica o fim.
    if (list.length === 0) return;
    yield list;
  }
}

export type SyncResult = { vistas: number; novas: number; ignoradas: number };

/**
 * Busca os últimos dias no Strava e grava só o que ainda não existe (mesma fonte e id, ou outra fonte
 * com início a até 10 min). Nunca regrava atividade existente, para não apagar zonas de FC já importadas.
 */
export async function syncStrava(athlete: Athlete, days = LOOKBACK_DAYS): Promise<SyncResult> {
  days = Math.min(Math.max(Math.round(days), 1), MAX_DAYS);
  const c = await getConnection(athlete.id);
  if (!c) throw new Error("Strava não conectado");
  try {
    const token = await freshToken(c);
    const since = Date.now() - days * 86_400_000;
    const existing = await sql<{ source: string; externalId: string; startTime: Date }[]>`
      SELECT source, external_id AS "externalId", start_time AS "startTime" FROM activities
      WHERE athlete_id = ${athlete.id} AND start_time >= ${new Date(since - 86_400_000)}`;
    const known = existing.map((e) => ({ source: e.source, id: e.externalId, start: e.startTime.toISOString() }));
    let vistas = 0, novas = 0;
    for await (const list of pages(token, Math.floor(since / 1000), days > LOOKBACK_DAYS ? 60 : 3)) {
      vistas += list.length;
      const fresh: ActivityIn[] = [];
      for (const m of list.filter((a) => !a.manual).map(mapStravaActivity)) {
        if (!m) continue;
        if (known.some((e) => (e.source === m.source && e.id === m.external_id) || sameInstant(e.start, m.start_time))) continue;
        known.push({ source: m.source, id: m.external_id, start: m.start_time });
        fresh.push(m);
      }
      if (fresh.length) await applyImport(athlete, { athlete: athlete.slug, planned: [], activities: fresh, zones: [], workouts: [], races: [] });
      novas += fresh.length;
    }
    await sql`UPDATE strava_connections SET last_sync_at = now(), last_sync_error = NULL WHERE athlete_id = ${athlete.id}`;
    return { vistas, novas, ignoradas: vistas - novas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    await sql`UPDATE strava_connections SET last_sync_error = ${msg.slice(0, 300)} WHERE athlete_id = ${athlete.id}`;
    throw e;
  }
}

/** Rotina diária: depois das 9h no fuso do atleta, uma vez por dia; com falha, tenta de novo em 30 min. */
export async function runDailySync(now = new Date()): Promise<void> {
  await ensureSchema();
  const slug = process.env.DEFAULT_ATHLETE || "giba";
  const athlete = await getAthlete(slug);
  if (!athlete) return;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: athlete.timezone }).format(now));
  if (hour < SYNC_HOUR) return;
  const today = localDate(now, athlete.timezone);
  // Reserva a tentativa de forma atômica (vale mesmo com mais de um processo).
  const claimed = await sql`
    UPDATE strava_connections SET last_try_at = now()
    WHERE athlete_id = ${athlete.id} AND last_auto_date IS DISTINCT FROM ${today}
      AND (last_try_at IS NULL OR last_try_at < now() - interval '30 minutes')
    RETURNING athlete_id`;
  if (!claimed.length) return;
  try {
    await syncStrava(athlete);
    await sql`UPDATE strava_connections SET last_auto_date = ${today} WHERE athlete_id = ${athlete.id}`;
  } catch (e) {
    console.error("[limiarlab] sync diário falhou:", e instanceof Error ? e.message : e);
  }
}
