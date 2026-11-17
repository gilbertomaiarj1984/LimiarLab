# Deploy do LimiarLab na VPS

Mesmo modelo do AgendaBoa: app isolado em `/opt/limiarlab`, sem portas publicadas, atrás do Caddy compartilhado (rede `proxy`), usando o Postgres 17 compartilhado com banco, role e rede **exclusivos** (`limiarlab_db`). Nenhum passo abaixo foi executado ainda; todos são manuais e feitos pelo dono da VPS.

## Uma vez só

1. **Banco e role.** Edite a senha em [`provision-db.sql`](provision-db.sql) e rode como superusuário:
   ```bash
   docker exec -i garimpo-postgres-1 psql -U <superuser> -d postgres < provision-db.sql
   ```
2. **Rede dedicada** e o Postgres dentro dela com o alias que o app usa:
   ```bash
   docker network create limiarlab_db
   docker network connect --alias limiarlab-postgres limiarlab_db garimpo-postgres-1
   ```
   Para isso sobreviver a um `docker compose up` do garimpo, aplique [`leilao-limiarlab.patch`](leilao-limiarlab.patch) no `docker-compose.yml` do leilao-finder-buddy (só adiciona a rede e o alias; não muda mais nada).
3. **Caddy.** Copie [`limiarlab.caddy`](limiarlab.caddy) para a pasta `sites/` do compose do garimpo e recarregue:
   ```bash
   docker exec garimpo-caddy-1 caddy validate --config /etc/caddy/Caddyfile
   docker exec garimpo-caddy-1 caddy reload --config /etc/caddy/Caddyfile
   ```
   Rode o `validate` antes do `reload`: este arquivo ainda não foi validado com o binário do Caddy.
4. **Pasta do app:**
   ```bash
   sudo mkdir -p /opt/limiarlab && cd /opt/limiarlab
   # copiar para cá: infra/docker-compose.yml, infra/backup.sh, infra/check.sh
   # e web/.env.example renomeado para .env.production
   chmod 600 .env.production
   ```
   Preencha o `.env.production`:
   - `DATABASE_URL=postgres://limiarlab:<senha>@limiarlab-postgres:5432/limiarlab`
   - `APP_PASSWORD` (senha de entrada no app)
   - `SESSION_SECRET` e `IMPORT_TOKEN`: gere cada um com `openssl rand -hex 32` (o token precisa de 32+ caracteres)
   - `DEFAULT_ATHLETE=giba`
5. **Imagem.** O GitHub Actions publica `ghcr.io/gilbertomaiarj1984/limiarlab:latest` a cada push na `main`. Se o pacote no GHCR ficar privado, faça `docker login ghcr.io` na VPS com um token de leitura de pacotes.

## Subir e atualizar

```bash
cd /opt/limiarlab
docker compose pull && docker compose up -d
bash check.sh        # verificação só de leitura
```

O schema do banco é criado pelo próprio app na primeira chamada de `/api/health` (idempotente, com trava).

## Depois de subir

- Abra `https://limiar.143-95-214-240.sslip.io`, entre com `APP_PASSWORD` e use "Adicionar à tela inicial" no celular.
- Configure a rotina do Claude com o `IMPORT_TOKEN` (ver [`docs/importacao.md`](../docs/importacao.md)).
- Backups: o serviço `backup` grava `pg_dump` diário no volume `limiarlab_backups`, com 14 dias de retenção. Restauração: `gunzip -c <arquivo> | docker exec -i garimpo-postgres-1 psql -U limiarlab -d limiarlab`.

## Rodar localmente

```bash
cd web
npm ci
npm test && npm run typecheck
DATABASE_URL=postgres://... APP_PASSWORD=... SESSION_SECRET=... IMPORT_TOKEN=... npm run dev
curl -X POST localhost:3000/api/import -H "Authorization: Bearer $IMPORT_TOKEN" \
  -H 'Content-Type: application/json' --data @fixtures/semana-2026-11-09.json
```
