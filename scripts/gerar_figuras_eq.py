# Gera assets/svg/<id>.svg das figuras novas das trocas (módulos scripts/figs_*.py, cada um com F = {id: (rótulo, corpo)})
# e preenche "ilustracao" em data/equivalencias.json. Uso na raiz do repo: python3 scripts/gerar_figuras_eq.py
import glob, importlib.util, json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
sys.path.insert(0, R + 'scripts')
from figlib import svg
D = json.load(open(R + 'data/equivalencias.json', encoding='utf-8'))
ids = {e['id']: e for e in D['exercicios']}
novas = {}
for f in sorted(glob.glob(R + 'scripts/figs_*.py')):
    spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    for k, (lab, body) in m.F.items():
        if k in novas: sys.exit(f'figura repetida: {k}')
        novas[k] = (lab, body)
for k, (lab, body) in novas.items():
    if k not in ids: sys.exit(f'figura para id desconhecido: {k}')
    open(R + f'assets/svg/{k}.svg', 'w', encoding='utf-8').write(svg(lab, body))
    if not ids[k].get('ilustracao'): ids[k]['ilustracao'] = f'assets/svg/{k}.svg'
json.dump(D, open(R + 'data/equivalencias.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
falta = [i for i, e in ids.items() if not e.get('ilustracao')]
print(f'{len(novas)} figuras geradas; sem ilustração: {len(falta)}', falta[:20])
