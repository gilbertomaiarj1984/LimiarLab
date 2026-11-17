"""Gera garmin/resources/jsonData/treinos.json (versão enxuta para o relógio) a partir de data/treinos/*.json.

Uso, na raiz do repositório:  python3 garmin/tools/gerar_treinos.py
"""
import glob
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ORDEM_DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]


def carga(e):
    pct = e.get("carga_pct_1rm")
    if pct:
        return f"{pct[0]}-{pct[1]}%" if len(pct) == 2 and pct[0] != pct[1] else f"{pct[0]}%"
    return e.get("carga", "")


def faixa(v):
    if isinstance(v, list):
        return f"{v[0]}-{v[1]}" if len(v) == 2 and v[0] != v[1] else str(v[0])
    return str(v)


def reps(e):
    if e.get("duracao_s"):
        texto = f"{faixa(e['duracao_s'])} s"
    else:
        r = faixa(e.get("reps", ""))
        # "8-12" vira "8-12 reps"; textos como "10 por lado" ficam como estão.
        texto = r if any(c.isalpha() for c in r) else f"{r} reps"
    if e.get("unidade"):
        texto += f" {e['unidade']}"
    return texto


treinos = []
for arq in glob.glob(os.path.join(RAIZ, "data", "treinos", "*.json")):
    t = json.load(open(arq, encoding="utf-8"))
    treinos.append({
        "nome": re.sub(r"\s*\([^)]*\)\s*$", "", t["nome"]),  # o dia já aparece no menu
        "dia": t["dia"],
        "ex": [
            {
                "n": e["nome"],
                "s": int(e["series"]),
                "r": reps(e),
                "c": carga(e),
                "d": int(e["descanso_s"]),
                "f": e.get("foco", ""),
                "t": e.get("dicas", [])[:3],
            }
            for e in sorted(t["exercicios"], key=lambda e: e["ordem"])
        ],
    })
treinos.sort(key=lambda t: ORDEM_DIAS.index(t["dia"]) if t["dia"] in ORDEM_DIAS else 99)

saida = os.path.join(RAIZ, "garmin", "resources", "jsonData", "treinos.json")
with open(saida, "w", encoding="utf-8") as f:
    json.dump(treinos, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(treinos)} treinos, {os.path.getsize(saida)} bytes -> {saida}")
