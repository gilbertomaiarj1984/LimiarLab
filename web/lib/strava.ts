// Strava (API oficial, só leitura). Funções puras de mapeamento ficam aqui para teste;
// a chamada de rede e o banco ficam em lib/sync.ts.
import type { ActivityIn } from "./import-schema.ts";

export const STRAVA_SCOPE = "activity:read_all";

/** Campos do SummaryActivity do Strava que usamos. */
export type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  workout_type?: number | null;
  start_date: string; // UTC, ISO 8601 com Z
  elapsed_time: number;
  moving_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  external_id?: string | null;
  manual?: boolean;
};

const RUN = new Set(["Run", "TrailRun", "VirtualRun"]);
const STRENGTH = new Set(["WeightTraining"]);
const LONG_RUN_M = 15_000;

/** O Strava guarda o id do Garmin em external_id ("garmin_push_123"): assim a atividade cai na mesma linha do import do Garmin. */
export function garminIdOf(externalId: string | null | undefined): string | null {
  const m = /^garmin_(?:push|ping)_(\d{5,})/.exec(externalId ?? "");
  return m ? m[1] : null;
}

const bpm = (n: number | undefined) => (n != null && Number.isFinite(n) && n >= 30 && n <= 250 ? Math.round(n) : null);

/** Converte uma atividade do Strava para o contrato de importação. null = ignorar (sem duração, etc.). */
export function mapStravaActivity(a: StravaActivity): ActivityIn | null {
  const dur = a.elapsed_time ?? a.moving_time ?? 0;
  if (!(dur > 0) || dur > 172_800 || Number.isNaN(Date.parse(a.start_date))) return null;
  const type = a.sport_type ?? a.type ?? "";
  const sport = RUN.has(type) ? "run" : STRENGTH.has(type) ? "strength" : "other";
  const dist = a.distance && a.distance > 0 ? Math.min(a.distance, 500_000) : null;
  const gid = garminIdOf(a.external_id);
  let kind: ActivityIn["kind"] = "outro";
  if (sport === "run") kind = a.workout_type === 1 ? "prova" : (dist ?? 0) >= LONG_RUN_M ? "longo" : "corrida";
  else if (sport === "strength") kind = "forca";
  return {
    source: gid ? "garmin" : "strava",
    external_id: gid ?? String(a.id),
    start_time: new Date(a.start_date).toISOString(),
    sport,
    kind,
    name: (a.name || "Atividade").slice(0, 200),
    duration_s: dur,
    distance_m: sport === "strength" ? null : dist,
    elevation_gain_m: sport === "run" && a.total_elevation_gain != null ? Math.min(Math.max(a.total_elevation_gain, 0), 20_000) : null,
    avg_hr: bpm(a.average_heartrate),
    max_hr: bpm(a.max_heartrate),
  };
}

/** Diferença máxima entre inícios para considerar a mesma atividade vinda de fontes diferentes. */
export const SAME_ACTIVITY_MS = 10 * 60_000;

export function sameInstant(a: string, b: string): boolean {
  return Math.abs(Date.parse(a) - Date.parse(b)) <= SAME_ACTIVITY_MS;
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    approval_prompt: "auto", scope: STRAVA_SCOPE, state,
  });
  return `https://www.strava.com/oauth/authorize?${q}`;
}
