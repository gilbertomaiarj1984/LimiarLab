#!/usr/bin/env bash
# Verificação SOMENTE LEITURA das ligações do LimiarLab com recursos compartilhados da VPS.
# Rode depois de qualquer deploy dos outros apps. Não altera nada; só diz o que falta.
# Uso: bash infra/check.sh   (ajuste PG/CADDY se os nomes dos containers mudarem)
PG="${PG:-garimpo-postgres-1}"
CADDY="${CADDY:-garimpo-caddy-1}"
DOMAIN="${DOMAIN:-limiar.143-95-214-240.sslip.io}"
ok() { echo "OK    $*"; }
bad() { echo "FALHA $*"; rc=1; }
rc=0

if docker inspect "$PG" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null | grep -qw limiarlab_db; then
  ok "Postgres está na rede limiarlab_db"
else
  bad "Postgres fora da rede limiarlab_db -> docker network connect --alias limiarlab-postgres limiarlab_db $PG"
fi

if docker exec "$CADDY" test -f /etc/caddy/sites/limiarlab.caddy 2>/dev/null; then
  ok "Caddy carregou sites/limiarlab.caddy"
else
  bad "Caddy sem sites/limiarlab.caddy -> copiar infra/limiarlab.caddy para a pasta sites/ do garimpo e recarregar o Caddy"
fi

state=$(docker inspect limiarlab-app --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' 2>/dev/null)
case "$state" in
  "running healthy"*) ok "limiarlab-app: $state" ;;
  *) bad "limiarlab-app: ${state:-ausente}" ;;
esac

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/api/health")
[ "$code" = "200" ] && ok "https://$DOMAIN/api/health -> 200" || bad "https://$DOMAIN/api/health -> $code"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/")
[ "$code" = "307" ] && ok "https://$DOMAIN/ pede senha (307 para /entrar)" || bad "https://$DOMAIN/ -> $code (esperado 307)"
exit $rc
