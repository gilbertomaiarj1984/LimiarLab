#!/usr/bin/env python3
"""Gera resources-<largura>/ (logos e ícone do launcher) para cada tamanho de tela e o monkey.jungle.
Rodar da pasta garmin-mostrador: python3 tools/gerar_recursos.py"""
from PIL import Image
import os, shutil

# id do dispositivo -> largura da tela (px). Forerunner de 2020 em diante (lista do SDK 8.x).
DISPOSITIVOS = {
    "fr745": 240, "fr945lte": 240, "fr55": 208,
    "fr255": 260, "fr255m": 260, "fr255s": 218, "fr255sm": 218, "fr955": 260,
    "fr265": 416, "fr265s": 360, "fr965": 454,
    "fr165": 390, "fr165m": 390,
    "fr57042mm": 390, "fr57047mm": 454, "fr970": 454,
    "fr70": 390, "fr170": 390, "fr170m": 390,
}
sg = Image.open("tools/fontes/sao_garrafa_cheia.png").convert("RGB")
rr = Image.open("tools/fontes/rafinha_cheia_vermelha.png").convert("RGB")

def ajustar(img, largura):
    h = max(1, round(img.height * largura / img.width))
    return img.resize((largura, h), Image.LANCZOS)

for d in os.listdir("."):
    if d.startswith("resources-"):
        shutil.rmtree(d)
for w in sorted(set(DISPOSITIVOS.values())):
    pasta = f"resources-{w}/drawables"
    os.makedirs(pasta)
    ajustar(sg, round(100 * w / 260)).save(f"{pasta}/sao_garrafa.png")
    ajustar(rr, round(84 * w / 260)).save(f"{pasta}/rafinha.png")
    ic = round(40 * w / 260)
    icone = Image.new("RGB", (ic, ic), (0, 0, 0))
    peq = ajustar(sg, ic)
    icone.paste(peq, (0, (ic - peq.height) // 2))
    icone.save(f"{pasta}/launcher_icon.png")
    with open(f"{pasta}/drawables.xml", "w") as f:
        f.write('<drawables>\n'
                '    <bitmap id="LauncherIcon" filename="launcher_icon.png"/>\n'
                '    <bitmap id="SaoGarrafa" filename="sao_garrafa.png"/>\n'
                '    <bitmap id="Rafinha" filename="rafinha.png"/>\n'
                '</drawables>\n')
with open("monkey.jungle", "w") as f:
    f.write("project.manifest = manifest.xml\n")
    for dev, w in DISPOSITIVOS.items():
        f.write(f"{dev}.resourcePath = $({dev}.resourcePath);resources-{w}\n")
with open("tools/produtos.txt", "w") as f:
    f.write("\n".join(DISPOSITIVOS) + "\n")
print(len(DISPOSITIVOS), "dispositivos")
