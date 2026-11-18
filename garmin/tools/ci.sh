#!/bin/bash
# Roda dentro da imagem ghcr.io/matco/connectiq-tester (SDK Connect IQ + arquivos de dispositivos).
# Compila o app para o Forerunner 955 e tira capturas de tela do simulador no modo demonstração.
# Tudo vai para garmin/build/ (publicado como artifact do workflow; nada é commitado).
set -u
cd /app
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT"
{
  echo "monkeyc: $(command -v monkeyc)"
  ls /root/.Garmin/ConnectIQ/Devices 2>/dev/null | tr '\n' ' '
  echo
} > "$OUT/ambiente.txt"

# Token do relógio (secret RELOGIO_TOKEN do GitHub): entra só no arquivo compilado, nunca no log nem no git.
if [ -n "${RELOGIO_TOKEN:-}" ]; then
  printf 'const RELOGIO_TOKEN = "%s";\n' "$RELOGIO_TOKEN" > source/Token.mc
  echo "token: definido" >> "$OUT/ambiente.txt"
else
  echo "token: vazio (o app usa os treinos fixos)" >> "$OUT/ambiente.txt"
fi

openssl genrsa -out /tmp/key.pem 4096 2>/dev/null
openssl pkcs8 -topk8 -inform PEM -outform DER -in /tmp/key.pem -out /tmp/key.der -nocrypt

monkeyc -f monkey.jungle -d fr955 -o "$OUT/limiarlab-forca.prg" -y /tmp/key.der -w > "$OUT/compilacao.txt" 2>&1
STATUS=$?
echo "status=$STATUS" >> "$OUT/compilacao.txt"
if [ $STATUS -ne 0 ]; then
  exit 0
fi

# Versão de demonstração (roteiro automático) só para as capturas.
cp -r /app /tmp/demo
sed -i 's/^const DEMO = false;/const DEMO = true;/' /tmp/demo/source/LimiarApp.mc
(cd /tmp/demo && monkeyc -f monkey.jungle -d fr955 -o /tmp/demo.prg -y /tmp/key.der >> /app/$OUT/compilacao.txt 2>&1) || exit 0

(apt-get update -qq && apt-get install -y -qq imagemagick) > /dev/null 2>&1
export DISPLAY=:1
Xvfb "$DISPLAY" -screen 0 1280x1024x24 &
sleep 3
simulator > "$OUT/simulador.txt" 2>&1 &
sleep 10
monkeydo /tmp/demo.prg fr955 > "$OUT/monkeydo.txt" 2>&1 &
for i in $(seq -w 1 24); do
  sleep 2
  import -window root "$OUT/tela-$i.png" 2>/dev/null
done
exit 0
