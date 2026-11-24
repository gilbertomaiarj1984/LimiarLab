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
      // Treinos de força detalhados (exercícios, séries, dicas), enviados pela rotina do Claude.
      await tx`
        CREATE TABLE IF NOT EXISTS workouts (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          slug        text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
          content     jsonb NOT NULL,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          UNIQUE (athlete_id, slug)
        )`;
      await tx`ALTER TABLE planned_sessions ADD COLUMN IF NOT EXISTS workout_slug text`;
      // Provas e metas (A = alvo, B = no caminho, C = como treino).
      await tx`
        CREATE TABLE IF NOT EXISTS races (
          id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          athlete_id        uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          source            text NOT NULL,
          external_id       text NOT NULL,
          date              date NOT NULL,
          name              text NOT NULL,
          distance_m        numeric(9,1) NOT NULL CHECK (distance_m > 0),
          elevation_gain_m  numeric(7,1),
          priority          text NOT NULL CHECK (priority IN ('A', 'B', 'C')),
          goal_time_s       integer,
          notes             text,
          created_at        timestamptz NOT NULL DEFAULT now(),
          updated_at        timestamptz NOT NULL DEFAULT now(),
          UNIQUE (athlete_id, source, external_id)
        )`;
      await tx`CREATE INDEX IF NOT EXISTS races_athlete_date_idx ON races (athlete_id, date)`;
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
      // Detalhe de corrida: id no Strava (para buscar as voltas) e as voltas já lidas (cache).
      await tx`ALTER TABLE activities ADD COLUMN IF NOT EXISTS strava_id bigint`;
      await tx`ALTER TABLE activities ADD COLUMN IF NOT EXISTS laps jsonb`;
      // Conexão com o Strava (leitura). Tokens ficam só neste banco; a rotina das 9h marca last_auto_date.
      await tx`
        CREATE TABLE IF NOT EXISTS strava_connections (
          athlete_id      uuid PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
          strava_athlete  bigint NOT NULL,
          access_token    text NOT NULL,
          refresh_token   text NOT NULL,
          expires_at      timestamptz NOT NULL,
          last_sync_at    timestamptz,
          last_sync_error text,
          last_auto_date  date,
          last_try_at     timestamptz,
          created_at      timestamptz NOT NULL DEFAULT now()
        )`;
      // Trocas de exercício feitas na academia (celular ou relógio), por treino, dia e posição do exercício.
      await tx`
        CREATE TABLE IF NOT EXISTS exercise_swaps (
          athlete_id    uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          date          date NOT NULL,
          workout_slug  text NOT NULL,
          ex            smallint NOT NULL CHECK (ex BETWEEN 1 AND 15),
          grp           smallint NOT NULL CHECK (grp BETWEEN 0 AND 9),
          alt_id        text NOT NULL,
          updated_at    timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (athlete_id, date, workout_slug, ex)
        )`;
      // Treino de força realizado, confirmado pelo atleta: o que foi feito de fato (com as trocas), por dia e treino.
      // Retrato no momento da confirmação (nomes e séries), para o histórico não mudar com o treino ou a base.
      await tx`
        CREATE TABLE IF NOT EXISTS strength_logs (
          athlete_id    uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          date          date NOT NULL,
          workout_slug  text NOT NULL,
          title         text NOT NULL,
          items         jsonb NOT NULL,
          notes         text,
          confirmed_at  timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (athlete_id, date, workout_slug)
        )`;
      // PSE da sessão (0–10, Foster 2001): carga da força = PSE × minutos.
      await tx`ALTER TABLE strength_logs ADD COLUMN IF NOT EXISTS rpe smallint CHECK (rpe BETWEEN 0 AND 10)`;
      await tx`
        CREATE TABLE IF NOT EXISTS import_log (
          id           bigserial PRIMARY KEY,
          athlete_id   uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          received_at  timestamptz NOT NULL DEFAULT now(),
          planned      integer NOT NULL,
          activities   integer NOT NULL,
          removed      integer NOT NULL
        )`;

      // IA configurável: provedor e modelo escolhidos por atleta. As chaves ficam só no servidor (env), nunca aqui.
      await tx`
        CREATE TABLE IF NOT EXISTS ai_settings (
          athlete_id  uuid PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
          provider    text NOT NULL CHECK (provider IN ('anthropic', 'gemini', 'groq')),
          models      jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_at  timestamptz NOT NULL DEFAULT now()
        )`;
      // Direcionamento editável enviado em toda chamada de IA (null = usa o padrão do código).
      await tx`ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS directive text`;
      // Histórico estruturado de toda chamada de IA (sucesso ou falha), para análises futuras.
      await tx`
        CREATE TABLE IF NOT EXISTS ai_runs (
          id                  bigserial PRIMARY KEY,
          athlete_id          uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          created_at          timestamptz NOT NULL DEFAULT now(),
          kind                text NOT NULL,
          requested_provider  text NOT NULL,
          provider            text,
          model               text,
          switched            boolean NOT NULL DEFAULT false,
          ok                  boolean NOT NULL,
          error               text,
          attempt_errors      jsonb NOT NULL DEFAULT '{}'::jsonb,
          input               jsonb NOT NULL,
          output              text,
          input_tokens        integer,
          output_tokens       integer,
          latency_ms          integer
        )`;
      await tx`CREATE INDEX IF NOT EXISTS ai_runs_athlete_created ON ai_runs (athlete_id, created_at DESC)`;
      // Feedback de IA de uma corrida (botão Feedback). Várias por atividade (regerar não apaga as antigas);
      // a tela mostra a mais recente. O texto exato enviado e a resposta bruta ficam em ai_runs (ai_run_id).
      await tx`
        CREATE TABLE IF NOT EXISTS run_feedback (
          id               bigserial PRIMARY KEY,
          athlete_id       uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          activity_id      uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
          ai_run_id        bigint REFERENCES ai_runs(id) ON DELETE SET NULL,
          created_at       timestamptz NOT NULL DEFAULT now(),
          payload_version  smallint NOT NULL,
          provider         text NOT NULL,
          model            text NOT NULL,
          verdict          text,
          intensity        text,
          structured       jsonb,
          raw_text         text NOT NULL,
          input_summary    jsonb NOT NULL
        )`;
      await tx`CREATE INDEX IF NOT EXISTS run_feedback_activity ON run_feedback (athlete_id, activity_id, created_at DESC)`;

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
