// Roda uma vez quando o servidor sobe: agenda a atualização diária do Strava (9h, fuso do atleta).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { runDailySync, stravaConfigured } = await import("./lib/sync");
  if (!stravaConfigured()) return;
  const tick = () => runDailySync().catch((e) => console.error("[limiarlab] agenda:", e instanceof Error ? e.message : e));
  setTimeout(tick, 30_000);
  setInterval(tick, 5 * 60_000).unref();
}
