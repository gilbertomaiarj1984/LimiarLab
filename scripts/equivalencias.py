# Gera app/web/equivalencias.html a partir de data/equivalencias.json e valida a base.
# Uso (na raiz do repo): python3 scripts/equivalencias.py
# Falha (exit 1) se a base tiver id sem cadastro, slot sem substituto, campo fora do domínio etc.
import json, os, re, subprocess, sys
from datetime import date

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
D = json.load(open(R + 'data/equivalencias.json', encoding='utf-8'))

PADROES = {"agachamento","dobradica-quadril","extensao-quadril","unilateral-joelho","flexao-joelho","extensao-joelho",
  "flexao-plantar-joelho-estendido","flexao-plantar-joelho-flexionado","abducao-quadril","aducao-quadril","pliometria",
  "puxada-vertical","remada-horizontal","empurrar-horizontal","empurrar-vertical","abducao-ombro","ombro-posterior",
  "flexao-cotovelo","extensao-cotovelo","core-antiextensao","core-antiflexao-lateral","core-antirrotacao","carregamento"}
EQUIP = {"maquina","cabo","halter","barra","smith","peso-corporal","banco","step","elastico","kettlebell","leg-press"}
NIVEL = {"baixa","media","alta"}
EQUIV = {"alta","media","baixa"}

erros = []
ex = {}
for e in D["exercicios"]:
    i = e.get("id", "?")
    if i in ex: erros.append(f"id duplicado: {i}")
    ex[i] = e
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", i): erros.append(f"id fora do padrão: {i}")
    if e.get("padrao") not in PADROES: erros.append(f"{i}: padrao inválido {e.get('padrao')}")
    for q in e.get("equipamento", []):
        if q not in EQUIP: erros.append(f"{i}: equipamento inválido {q}")
    if not e.get("equipamento"): erros.append(f"{i}: sem equipamento")
    if e.get("impacto") not in (0, 1, 2, 3): erros.append(f"{i}: impacto inválido")
    for k in ("fadiga", "tecnica", "estabilidade_exigida"):
        if e.get(k) not in NIVEL: erros.append(f"{i}: {k} inválido")
    for k, v in (e.get("carga_articular") or {}).items():
        if v not in NIVEL: erros.append(f"{i}: carga_articular.{k} inválido")
    tc = e.get("transferencia_corrida") or {}
    if tc.get("nota") not in (0, 1, 2, 3): erros.append(f"{i}: transferencia_corrida.nota inválida")
    il = e.get("ilustracao")
    if il and not (os.path.exists(R + il)): erros.append(f"{i}: ilustração inexistente {il}")

treinos = {t["id"] for t in D["treinos"]}
for s in D["slots"]:
    tag = f'{s["treino"]}#{s["ordem"]}'
    if s["treino"] not in treinos: erros.append(f"{tag}: treino desconhecido")
    if s["original"] not in ex: erros.append(f"{tag}: original sem cadastro {s['original']}")
    subs = s.get("substitutos", [])
    if len(subs) < 3: erros.append(f"{tag}: menos de 3 substitutos")
    ids = [x["id"] for x in subs]
    if len(set(ids)) != len(ids): erros.append(f"{tag}: substituto repetido")
    if s["original"] in ids: erros.append(f"{tag}: original listado como substituto")
    for x in subs:
        if x["id"] not in ex: erros.append(f"{tag}: substituto sem cadastro {x['id']}")
        if x.get("equivalencia") not in EQUIV: erros.append(f"{tag}: equivalencia inválida em {x['id']}")
    for x in s.get("evitar", []):
        if x["id"] not in ex: erros.append(f"{tag}: evitar sem cadastro {x['id']}")
        if x["id"] in ids: erros.append(f"{tag}: {x['id']} está em substitutos e em evitar")
    # véspera do longão: nada de impacto acima do original nem fadiga alta
    if s["treino"] == "inferiores-quinta":
        for x in subs:
            e = ex.get(x["id"])
            if e and (e["impacto"] > ex[s["original"]]["impacto"] or e["fadiga"] == "alta"):
                erros.append(f"{tag}: {x['id']} tem impacto ou fadiga alta demais para a véspera do longão")
    if not any(all(q in {"halter","peso-corporal","elastico","kettlebell","banco","step"} for q in ex.get(x["id"], {}).get("equipamento", ["maquina"])) for x in subs):
        erros.append(f"{tag}: nenhum substituto sem máquina/cabo")

usados = {s["original"] for s in D["slots"]} | {x["id"] for s in D["slots"] for x in s["substitutos"] + s.get("evitar", [])}
for i in ex:
    if i not in usados: erros.append(f"exercício cadastrado e não usado: {i}")

if erros:
    print("\n".join(erros)); sys.exit(1)

# figuras: assets/svg do repo
figs = {}
for e in D["exercicios"]:
    il = e.get("ilustracao")
    if il and il not in figs:
        figs[il] = open(R + il, encoding="utf-8").read()

def br(iso): y, m, d = iso.split("-"); return f"{d}/{m}/{y}"
D2 = dict(D, revisado_em_br=br(D["revisado_em"]), proxima_revisao_br=br(D["proxima_revisao"]))
tpl = open(R + "scripts/equivalencias_template.html", encoding="utf-8").read()
safe = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
html = tpl.replace("/*DATA*/", safe(D2)).replace("/*FIGS*/", safe(figs))
os.makedirs(R + "app/web", exist_ok=True)
open(R + "app/web/equivalencias.html", "w", encoding="utf-8").write(html)
sem_fig = sorted(i for i, e in ex.items() if not e.get("ilustracao"))
print(f"ok: {len(ex)} exercícios, {len(D['slots'])} slots, {len(figs)} figuras; sem ilustração: {len(sem_fig)}")

# cópia compacta para o app (web/lib), quando o app existe neste branch
if os.path.isdir(R + 'web/lib'):
    slim = dict(D)
    open(R + 'web/lib/equivalencias-data.json', 'w', encoding='utf-8').write(json.dumps(slim, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('web/lib/equivalencias-data.json atualizado')
