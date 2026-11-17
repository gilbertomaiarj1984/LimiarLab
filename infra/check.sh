#!/usr/bin/env bash
# Verificação SOMENTE LEITURA do LimiarLab. Não altera nada; só diz o que falta.
# Uso (na VPS): bash /opt/limiarlab/check.sh   (ajuste CADDY/DOMAIN se os nomes mudarem)
CADDY="${CADDY:-garimpo-caddy-1}"
DOMAIN="${DOMAIN:-limiar.143-95-214-240.sslip.io}"
ok() { echo "OK    $*"; }
bad() { echo "FALHA $*"; rc=1; }
rc=0

for c in limiarlab-postgres limiarlab-app limiarlab-backup; do
  state=$(docker inspect "$c" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' 2>/dev/null)
  case "$c:$state" in
    limiarlab-backup:"running"*) ok "$c: $state" ;;
    *:"running healthy"*) ok "$c: $state" ;;
    *) bad "$c: ${state:-ausente}" ;;
  esac
done

if docker exec "$CADDY" test -f /etc/caddy/sites/limiarlab.caddy 2>/dev/null; then
  ok "Caddy enxerga sites/limiarlab.caddy"
else
  bad "Caddy sem sites/limiarlab.caddy (copiar para a pasta sites/ do garimpo e recarregar)"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/api/health")
[ "$code" = "200" ] && ok "https://$DOMAIN/api/health -> 200" || bad "https://$DOMAIN/api/health -> $code"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/")
[ "$code" = "307" ] && ok "https://$DOMAIN/ pede senha (307 para /entrar)" || bad "https://$DOMAIN/ -> $code (esperado 307)"
exit $rc
