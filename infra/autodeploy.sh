#!/usr/bin/env bash
# Atualização automática do LimiarLab (SÓ o container `app`). Pensado para rodar a cada poucos minutos pelo cron.
# - Baixa a imagem `:latest` (o CI só a publica depois de testes e typecheck verdes na main).
# - Se não mudou, não faz nada. Se mudou, sobe só o `app` e espera ficar saudável.
# - Se não ficar saudável, volta sozinho para a imagem anterior.
# Nunca toca em postgres, backup, Caddy nem em outros apps da VPS: todo comando usa o projeto limiarlab e o serviço `app`.
# Instalação: ver infra/README.md ("Atualização automática").
set -u
DIR="${DIR:-/opt/limiarlab}"
IMAGE="${APP_IMAGE_BASE:-ghcr.io/gilbertomaiarj1984/limiarlab}:latest"
ROLLBACK_TAG="limiarlab-rollback:previous"
LOG="$DIR/autodeploy.log"
WAIT_S="${WAIT_S:-120}"

cd "$DIR" || exit 1
log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

# Uma execução por vez.
exec 9>"$DIR/.autodeploy.lock"
flock -n 9 || exit 0

# Mantém o log pequeno (últimas 500 linhas).
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 1000 ]; then tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi

before=$(docker inspect limiarlab-app --format '{{.Image}}' 2>/dev/null || true)
if ! docker compose pull app >/dev/null 2>&1; then
  log "pull falhou (rede ou GHCR); nada alterado"
  exit 0
fi
after=$(docker image inspect "$IMAGE" --format '{{.Id}}' 2>/dev/null || true)
if [ -z "$after" ] || [ "$before" = "$after" ]; then exit 0; fi
# Imagem que já falhou e foi revertida: não tenta de novo até sair uma imagem diferente.
if [ -f "$DIR/.autodeploy.bad" ] && [ "$(cat "$DIR/.autodeploy.bad")" = "$after" ]; then exit 0; fi

log "imagem nova: ${after#sha256:} (antes: ${before#sha256:})"
[ -n "$before" ] && docker tag "$before" "$ROLLBACK_TAG" 2>/dev/null

wait_healthy() {
  local i=0 st
  while [ "$i" -lt "$WAIT_S" ]; do
    st=$(docker inspect limiarlab-app --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' 2>/dev/null || echo ausente)
    [ "$st" = "healthy" ] && return 0
    sleep 3; i=$((i + 3))
  done
  return 1
}

docker compose up -d app >/dev/null 2>&1
if wait_healthy; then
  log "OK: app saudável na imagem nova"
  rm -f "$DIR/.autodeploy.bad"
  exit 0
fi

log "FALHA: app não ficou saudável; voltando para a imagem anterior"
printf '%s' "$after" > "$DIR/.autodeploy.bad"
if [ -n "$before" ] && docker image inspect "$ROLLBACK_TAG" >/dev/null 2>&1; then
  APP_IMAGE="$ROLLBACK_TAG" docker compose up -d app >/dev/null 2>&1
  if wait_healthy; then log "rollback OK: app saudável na imagem anterior"; else log "ROLLBACK FALHOU: verificar com bash $DIR/check.sh"; fi
else
  log "sem imagem anterior para voltar: verificar com bash $DIR/check.sh"
fi
exit 1
