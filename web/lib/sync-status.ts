import { getConnection, stravaConfigured } from "./sync";

/** Estado do Strava para o botão Atualizar: configurado, conectado e quando atualizou. */
export async function syncStatus(athleteId: string, timeZone: string) {
  const configured = stravaConfigured() && !!process.env.APP_URL;
  const c = configured ? await getConnection(athleteId) : null;
  const lastSync = c?.lastSyncAt
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone }).format(c.lastSyncAt).replace(",", " às")
    : null;
  return { configured, connected: !!c, lastSync };
}
