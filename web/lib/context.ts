// Contexto comum das telas: atleta atual, hoje no fuso dele e fisiologia vigente.
// Fase 1: um atleta fixo (DEFAULT_ATHLETE). Com login, o atleta vem da sessão.
import { getAthlete, getPhysiology, type Athlete, type PhysiologyRow } from "./repo";
import { localDate } from "./domain";

export type Ctx = { athlete: Athlete; today: string; phys: PhysiologyRow };

export async function loadContext(now = new Date()): Promise<Ctx> {
  const slug = process.env.DEFAULT_ATHLETE || "giba";
  const athlete = await getAthlete(slug);
  if (!athlete) throw new Error(`Atleta "${slug}" não existe no banco.`);
  const today = localDate(now, athlete.timezone);
  const phys = await getPhysiology(athlete.id, today);
  if (!phys) throw new Error(`Atleta "${slug}" sem limiares cadastrados.`);
  return { athlete, today, phys };
}
