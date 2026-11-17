-- EXECUTAR MANUALMENTE, UMA VEZ, pelo dono da VPS, conectado como superusuário da instância
-- Postgres compartilhada (ex.: via `docker exec -i <container-postgres> psql -U <superuser> -d postgres`).
-- Cria banco e role EXCLUSIVOS do LimiarLab. Não toca em nenhum objeto existente.
-- Troque a senha antes de rodar.

CREATE ROLE limiarlab LOGIN PASSWORD 'TROQUE-POR-SENHA-FORTE'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 10;

CREATE DATABASE limiarlab OWNER limiarlab;

-- Ninguém além do dono (e superusuários) conecta nesse banco...
REVOKE CONNECT ON DATABASE limiarlab FROM PUBLIC;
-- ...e o role do LimiarLab não conecta em nenhum outro banco da instância.
-- (Rode também, uma vez, para cada banco existente: REVOKE CONNECT ON DATABASE <db> FROM PUBLIC;
--  se o leilao-finder-buddy ainda permitir CONNECT para PUBLIC — é o padrão do Postgres.
--  Isso é uma mudança no banco do OUTRO app: só o dono decide aplicá-la.)

-- Limite de tempo por consulta, para proteger a instância compartilhada (o backup desliga só na sessão dele).
ALTER ROLE limiarlab SET statement_timeout = '10s';
