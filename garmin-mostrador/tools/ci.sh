#!/bin/bash
# Roda dentro da imagem ghcr.io/matco/connectiq-tester. Gera .prg (instalar por USB), .iq (Connect IQ Store) e capturas do simulador.
set -u
cd /app
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT"
{ echo "monkeyc: $(command -v monkeyc)"; } > "$OUT/ambiente.txt"

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
# Confere cada dispositivo da lista, um a um (o export pode ignorar algum sem avisar).
: > "$OUT/dispositivos.txt"
for dev in $(cat tools/produtos.txt); do
  monkeyc -f monkey.jungle -d "$dev" -o "/tmp/$dev.prg" -y /tmp/key.der > "/tmp/$dev.log" 2>&1
  echo "$dev status=$?" >> "$OUT/dispositivos.txt"
done
echo "--- produtos dentro do .iq ---" >> "$OUT/dispositivos.txt"
{
  # O .iq é um arquivo 7z (começa com 37 7a bc af): instala o 7z só para listar o conteúdo.
  (apt-get update -qq && apt-get install -y -qq p7zip-full) > /dev/null 2>&1
  rm -rf /tmp/iqx && mkdir /tmp/iqx
  7z x -y -o/tmp/iqx "/app/$OUT/sao-garrafa-run.iq" > /tmp/7z.log 2>&1 || true
  echo "7z: $(tail -3 /tmp/7z.log | tr '\n' ' ')"
  ls -R /tmp/iqx | head -30
  echo "produtos no manifest do .iq:"
  grep -rhoE 'product id="[a-z0-9_]+"' /tmp/iqx 2>/dev/null | sort -u | sed 's/product id=//' | tr -d '"' | tr '\n' ' '
  echo
} >> "$OUT/dispositivos.txt" 2>&1
ls -l "$OUT"/*.prg "$OUT"/*.iq >> "$OUT/compilacao.txt" 2>&1

exit 0
