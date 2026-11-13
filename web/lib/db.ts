import postgres from "postgres";

// Conexão única por processo. DATABASE_URL aponta para o banco e o usuário PRÓPRIOS do LimiarLab
// na instância Postgres compartilhada da VPS (ver infra/README.md), nunca para o banco de outro app.
const g = globalThis as unknown as { sql?: postgres.Sql; schemaReady?: Promise<void> };

export const sql =
  g.sql ??
  (g.sql = postgres(process.env.DATABASE_URL ?? "", {
    max: 5,
    idle_timeout: 20,
    // numeric chega como string; converte para número (valores pequenos, sem risco de precisão).
    types: { numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
  }));

// Idempotente (tudo IF NOT EXISTS). Multiusuário desde o início: todo dado de treino tem athlete_id.
export function ensureSchema(): Promise<void> {
  return (g.schemaReady ??= (async () => {
    await sql.begin(async (tx) => {
      // Serializa a criação entre processos que subirem ao mesmo tempo.
      await tx`SELECT pg_advisory_xact_lock(4419001)`;
      await tx`
        CREATE TABLE IF NOT EXISTS users (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name        text NOT NULL,
          email       text UNIQUE,
          role        text NOT NULL DEFAULT 'atleta' CHECK (role IN ('atleta', 'coach', 'admin')),
          created_at  timestamptz NOT NULL DEFAULT now()
        )`;
      await tx`
        CREATE TABLE IF NOT EXISTS athletes (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id     uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
          slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
          name        text NOT NULL,
          timezone    text NOT NULL DEFAULT 'America/Sao_Paulo',
          goal        text,
          created_at  timestamptz NOT NULL DEFAULT now()
        )`;
      await tx`
        CREATE TABLE IF NOT EXISTS athlete_physiology (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          athlete_id   uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          valid_from   date NOT NULL,
          lv1          smallint NOT NULL CHECK (lv1 BETWEEN 60 AND 230),
          lv2          smallint NOT NULL CHECK (lv2 BETWEEN 60 AND 230),
          hard_from    smallint NOT NULL CHECK (hard_from BETWEEN 60 AND 230),
          easy_target  smallint NOT NULL CHECK (easy_target BETWEEN 60 AND 230),
          long_target  smallint NOT NULL CHECK (long_target BETWEEN 60 AND 230),
          hr_max       smallint,
          vo2max       numeric(4,1),
          source       text NOT NULL,
          created_at   timestamptz NOT NULL DEFAULT now(),
          UNIQUE (athlete_id, valid_from),
          CHECK (lv1 < lv2)
        )`;
      // Fase de coaches: quem acompanha quem. Fica vazia por enquanto.
      await tx`
        CREATE TABLE IF NOT EXISTS coach_athletes (
          coach_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          athlete_id    uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          created_at    timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (coach_user_id, athlete_id)
        )`;
      await tx`
        CREATE TABLE IF NOT EXISTS planned_sessions (
          id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          athlete_id        uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          source            text NOT NULL,
          external_id       text NOT NULL,
          date              date NOT NULL,
          sport             text NOT NULL CHECK (sport IN ('run', 'strength', 'other')),
          kind              text NOT NULL,
          title             text NOT NULL,
          notes             text,
          target_duration_s integer,
          target_distance_m numeric(9,1),
          target_hr_max     smallint,
          optional          boolean NOT NULL DEFAULT false,
          created_at        timestamptz NOT NULL DEFAULT now(),
          updated_at        timestamptz NOT NULL DEFAULT now(),
          UNIQUE (athlete_id, source, external_id)
        )`;
      await tx`CREATE INDEX IF NOT EXISTS planned_athlete_date_idx ON planned_sessions (athlete_id, date)`;
      await tx`
        CREATE TABLE IF NOT EXISTS activities (
          id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          athlete_id         uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          source             text NOT NULL,
          external_id        text NOT NULL,
          start_time         timestamptz NOT NULL,
          date               date NOT NULL,
          sport              text NOT NULL CHECK (sport IN ('run', 'strength', 'other')),
          kind               text NOT NULL,
          name               text NOT NULL,
          duration_s         numeric(9,1) NOT NULL CHECK (duration_s > 0),
          distance_m         numeric(9,1),
          elevation_gain_m   numeric(7,1),
          avg_hr             smallint,
          max_hr             smallint,
          hr_zones           jsonb,
          rpe                smallint CHECK (rpe BETWEEN 0 AND 10),
          planned_session_id uuid REFERENCES planned_sessions(id) ON DELETE SET NULL,
          created_at         timestamptz NOT NULL DEFAULT now(),
          updated_at         timestamptz NOT NULL DEFAULT now(),
          UNIQUE (athlete_id, source, external_id)
        )`;
      await tx`CREATE INDEX IF NOT EXISTS activities_athlete_date_idx ON activities (athlete_id, date)`;
      await tx`
        CREATE TABLE IF NOT EXISTS import_log (
          id           bigserial PRIMARY KEY,
          athlete_id   uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          received_at  timestamptz NOT NULL DEFAULT now(),
          planned      integer NOT NULL,
          activities   integer NOT NULL,
          removed      integer NOT NULL
        )`;

      // Atleta inicial (fase 1: um só). Números do teste cardiopulmonar de 23/07/2026 (data/zonas.json).
      const [{ n }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM athletes`;
      if (n === 0) {
        const [u] = await tx<{ id: string }[]>`INSERT INTO users (name, role) VALUES ('Giba', 'admin') RETURNING id`;
        const [a] = await tx<{ id: string }[]>`
          INSERT INTO athletes (user_id, slug, name, goal)
          VALUES (${u.id}, 'giba', 'Giba', 'Longos, ultramaratona e força de pernas. Superiores pela estética.')
          RETURNING id`;
        await tx`
          INSERT INTO athlete_physiology
            (athlete_id, valid_from, lv1, lv2, hard_from, easy_target, long_target, hr_max, vo2max, source)
          VALUES (${a.id}, '2026-07-23', 141, 159, 157, 135, 138, 165, 47.1, 'Teste cardiopulmonar')`;
      }
    });
  })().catch((e) => {
    g.schemaReady = undefined;
    throw e;
  }));
}
