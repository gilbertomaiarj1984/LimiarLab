# Deploy do LimiarLab na VPS

## Regra: nenhum app que já roda pode ser afetado

O LimiarLab vive 100% em `/opt/limiarlab`, num projeto Docker Compose próprio (`limiarlab`): app, **Postgres próprio** e backup. Ele não usa o Postgres do garimpo, não altera o compose nem o repositório de nenhum outro app e não cria nem muda redes ou volumes deles.

Os únicos pontos de contato com o que já existe, e como cada um é protegido:

| Ponto de contato | O que fazemos | Risco para os outros |
|---|---|---|
| Rede `proxy` (já existe) | O app só **entra** nela, com o alias único `limiarlab-app` | Nenhum: não criamos nem alteramos a rede. Os containers dela passam a enxergar o nosso, como já enxergam uns aos outros |
| Caddy compartilhado | **Um arquivo novo** `sites/limiarlab.caddy`, validado antes de ser colocado e de novo depois, e só então `caddy reload` | O reload é gradual e, se a configuração for inválida, o Caddy mantém a anterior. O deploy do garimpo também valida a pasta `sites/`, então um arquivo ruim travaria o deploy dele: por isso validamos antes e removemos na hora se falhar |
| Disco, RAM, CPU | Limites de 256 MB (app), 256 MB (Postgres) e 64 MB (backup); logs com teto de 30 MB por serviço | Conferido no passo 1 antes de subir |
| GHCR | Baixar a imagem pública do LimiarLab | Nenhum, desde que não se troque o `docker login` já existente (ver passo 5) |

**Comandos proibidos** (afetam todos os apps): `docker system prune`, `docker network prune`, `docker volume prune`, `docker stop $(docker ps -q)`, `docker compose down` fora de `/opt/limiarlab`, `pkill`/`killall`, `systemctl restart caddy`, qualquer mudança de firewall. Todo `docker compose` deste projeto roda **dentro de `/opt/limiarlab`**.

## Passo a passo

Os comandos completos de cada passo foram entregues um por vez na conversa. Resumo:

1. **Conferir a VPS (somente leitura):** containers, redes, memória, disco, cron, pasta e nome do Caddy.
2. **Pasta e arquivos:** `/opt/limiarlab` com `docker-compose.yml`, `backup.sh`, `check.sh`, `limiarlab.caddy`, `.env` (só `POSTGRES_PASSWORD`) e `.env.production` (`APP_PASSWORD`, `SESSION_SECRET`, `IMPORT_TOKEN`, `DEFAULT_ATHLETE`), ambos `chmod 600`. Gere os segredos com `openssl rand -hex 24` (senha do Postgres, só hexadecimal para não quebrar a URL) e `openssl rand -hex 32` (sessão e token).
3. **Validar o compose** sem subir nada: `docker compose config -q`.
4. **Imagem:** `docker compose pull`. Se o GHCR negar, torne o pacote público em GitHub > Packages > limiarlab > Package settings > Change visibility. Se preferir mantê-lo privado, use um `DOCKER_CONFIG` separado em vez de `docker login` direto, para não sobrescrever o login que os outros apps possam usar: `DOCKER_CONFIG=/opt/limiarlab/.docker docker login ghcr.io` e depois `DOCKER_CONFIG=/opt/limiarlab/.docker docker compose pull`.
5. **Subir e esperar ficar saudável** (`docker compose up -d`, depois `docker compose ps`). O schema é criado pelo próprio app na primeira chamada de `/api/health`.
6. **Caddy:** validar o arquivo isolado, copiar para `sites/`, validar a configuração real, recarregar.
7. **Verificar** com `check.sh`, abrir o endereço e instalar no celular.

## Atualizar para uma versão nova

```bash
cd /opt/limiarlab
docker compose pull app
docker compose up -d app
bash check.sh
```

O CI publica `ghcr.io/gilbertomaiarj1984/limiarlab:latest` e `:<sha do commit>` a cada push na `main`. Para voltar a uma versão anterior: `APP_IMAGE=ghcr.io/gilbertomaiarj1984/limiarlab:<sha> docker compose up -d app`.

## Desfazer tudo (só o LimiarLab)

```bash
cd /opt/limiarlab
docker compose down            # só os 3 containers e a rede deste projeto; os dados ficam nos volumes
# para apagar também os dados (irreversível): docker compose down -v
sudo rm <pasta-sites>/limiarlab.caddy
docker exec garimpo-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

## Backups

O serviço `backup` grava um `pg_dump` por dia no volume `limiarlab_backups` (14 dias de retenção local). Para ver: `docker run --rm -v limiarlab_backups:/b alpine ls -la /b`. Restaurar num banco vazio:

```bash
docker run --rm -v limiarlab_backups:/b alpine cat /b/<arquivo>.sql.gz | gunzip | docker exec -i limiarlab-postgres psql -U limiarlab -d limiarlab
```

Esse volume mora na própria VPS: quando o app tiver dados de valor, vale copiar os dumps para fora dela.

## Rotina do Claude

Configure a rotina com o `IMPORT_TOKEN` (ver [`docs/importacao.md`](../docs/importacao.md)).

## Rodar localmente

```bash
cd web
npm ci
npm test && npm run typecheck
DATABASE_URL=postgres://... APP_PASSWORD=... SESSION_SECRET=... IMPORT_TOKEN=... npm run dev
curl -X POST localhost:3000/api/import -H "Authorization: Bearer $IMPORT_TOKEN" \
  -H 'Content-Type: application/json' --data @fixtures/semana-2026-11-09.json
```
