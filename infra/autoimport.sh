#!/usr/bin/env bash
# Importa sozinho os lotes de web/fixtures/auto/ (lista em INDEX.txt) para o LimiarLab.
# Chamado pelo autodeploy.sh. Só faz curl para o próprio app; não toca em Docker, Caddy nem outros apps.
# O IMPORT_TOKEN vem do .env.production da própria VPS e nunca é gravado em log.
set -u
DIR="${DIR:-/opt/limiarlab}"
DOMAIN="${DOMAIN:-limiar.143-95-214-240.sslip.io}"
RAW="${RAW:-https://raw.githubusercontent.com/gilbertomaiarj1984/LimiarLab/main/web/fixtures/auto}"
LOG="$DIR/autoimport.log"
APPLIED="$DIR/.autoimport.applied"   # linhas "arquivo sha256" já aplicadas com sucesso
FAILED="$DIR/.autoimport.failed"     # linhas "arquivo sha256" recusadas (não repete o mesmo conteúdo)
cd "$DIR" || exit 1
touch "$APPLIED" "$FAILED"
log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 1000 ]; then tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi

TOKEN=$(grep -m1 '^IMPORT_TOKEN=' .env.production 2>/dev/null | cut -d= -f2- | tr -d "\"'
")
[ -n "$TOKEN" ] || { log "sem IMPORT_TOKEN em .env.production"; exit 1; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
curl -fsS --max-time 20 "$RAW/INDEX.txt" -o "$tmp/INDEX.txt" 2>/dev/null || exit 0   # sem rede ou sem índice: tenta no próximo ciclo

while IFS= read -r name; do
  name=$(printf '%s' "$name" | tr -d '\r')
  case "$name" in ''|'#'*) continue ;; esac
  case "$name" in *[!A-Za-z0-9._-]*|*..*) log "nome inválido ignorado: $name"; continue ;; esac
  curl -fsS --max-time 30 "$RAW/$name" -o "$tmp/$name" 2>/dev/null || { log "não consegui baixar $name"; continue; }
  sha=$(sha256sum "$tmp/$name" | cut -d' ' -f1)
  grep -qxF "$name $sha" "$APPLIED" && continue
  grep -qxF "$name $sha" "$FAILED" && continue
  code=$(curl -s --max-time 60 -o "$tmp/resp.json" -w '%{http_code}' -X POST "https://$DOMAIN/api/import" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data-binary @"$tmp/$name")
  if [ "$code" = "200" ]; then
    echo "$name $sha" >> "$APPLIED"; log "importado $name: $(head -c 300 "$tmp/resp.json")"
  elif [ "$code" = "401" ] || [ "$code" = "000" ] || [ "$code" -ge 500 ] 2>/dev/null; then
    log "erro temporário ($code) em $name; tenta de novo no próximo ciclo"
  else
    echo "$name $sha" >> "$FAILED"; log "RECUSADO $name (HTTP $code): $(head -c 400 "$tmp/resp.json")"
  fi
done < "$tmp/INDEX.txt"
exit 0
