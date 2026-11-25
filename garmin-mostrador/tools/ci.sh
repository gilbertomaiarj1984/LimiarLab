#!/bin/bash
# Roda dentro da imagem ghcr.io/matco/connectiq-tester. Gera .prg (instalar por USB), .iq (Connect IQ Store) e capturas do simulador.
set -u
cd /app
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT"
{ echo "monkeyc: $(command -v monkeyc)"; } > "$OUT/ambiente.txt"
# Lista de dispositivos Forerunner conhecidos pelo SDK (id, tela, tipo) para conferência.
for d in /root/.Garmin/ConnectIQ/Devices/fr*; do
  [ -f "$d/compiler.json" ] || continue
  echo "DISPOSITIVO $(basename "$d") $(python3 -c "import json,sys;j=json.load(open('$d/compiler.json'));print(j['resolution'] if 'resolution' in j else '', j.get('displayType', ''), j.get('partNumbers',[{}])[0].get('connectIQVersion',''))" 2>&1)" >> "$OUT/ambiente.txt"
done
ls /root/.Garmin/ConnectIQ/Devices | tr '\n' ' ' >> "$OUT/ambiente.txt"

# Chave de desenvolvedor: fixa (secret CIQ_DEVELOPER_KEY, base64 do .der) ou, na falta dela, aleatória (só serve para teste).
if [ -n "${CIQ_DEVELOPER_KEY:-}" ]; then
  echo "$CIQ_DEVELOPER_KEY" | base64 -d > /tmp/key.der
  echo "chave: fixa (secret)" >> "$OUT/ambiente.txt"
else
  openssl genrsa -out /tmp/key.pem 4096 2>/dev/null
  openssl pkcs8 -topk8 -inform PEM -outform DER -in /tmp/key.pem -out /tmp/key.der -nocrypt
  echo "chave: ALEATORIA (não serve para a loja)" >> "$OUT/ambiente.txt"
fi

monkeyc -f monkey.jungle -d fr955 -o "$OUT/sao-garrafa-run.prg" -y /tmp/key.der -w > "$OUT/compilacao.txt" 2>&1
echo "status=$?" >> "$OUT/compilacao.txt"
monkeyc -e -r -f monkey.jungle -o "$OUT/sao-garrafa-run.iq" -y /tmp/key.der -w >> "$OUT/compilacao.txt" 2>&1
echo "status_iq=$?" >> "$OUT/compilacao.txt"
ls -l "$OUT"/*.prg "$OUT"/*.iq >> "$OUT/compilacao.txt" 2>&1
grep -q '^status=0$' "$OUT/compilacao.txt" || exit 0

(apt-get update -qq && apt-get install -y -qq imagemagick) > /dev/null 2>&1
export DISPLAY=:1
Xvfb "$DISPLAY" -screen 0 1280x1024x24 &
sleep 3
simulator > "$OUT/simulador.txt" 2>&1 &
sleep 10
monkeydo "$OUT/sao-garrafa-run.prg" fr955 > "$OUT/monkeydo.txt" 2>&1 &
for i in 1 2 3; do sleep 4; import -window root "$OUT/tela-$i.png" 2>/dev/null; done
exit 0
