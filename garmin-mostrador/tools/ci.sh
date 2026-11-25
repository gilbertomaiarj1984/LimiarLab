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
python3 - >> "$OUT/dispositivos.txt" 2>&1 <<'PY'
import zipfile, re
z = zipfile.ZipFile("/app/build/sao-garrafa-run.iq")
print("arquivos no .iq:", z.namelist()[:12])
for n in z.namelist():
    if n.endswith(".xml") or n.endswith(".json") or "manifest" in n.lower():
        t = z.read(n).decode("utf-8", "ignore")
        ids = sorted(set(re.findall(r'product id="([a-z0-9_]+)"', t)))
        if ids:
            print(n, len(ids), "produtos:", " ".join(ids))
PY
ls -l "$OUT"/*.prg "$OUT"/*.iq >> "$OUT/compilacao.txt" 2>&1

exit 0
