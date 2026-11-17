# Uso (na raiz do repo): python3 scripts/figuras.py
# 1) grava em assets/svg/ as figuras desenhadas em scripts/desenhos_exercicios.py;
# 2) gera web/lib/figures.ts com TODAS as figuras de assets/svg/ para o app.
import sys,re,os,json
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
sys.path.insert(0,R+'scripts')
from desenhos_exercicios import F
tmpl=open(R+'assets/svg/step-up.svg').read()
style=tmpl.split('<style>')[1].split('</style>')[0]
defs='<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b8c3be"/></marker></defs>'
for k,(lab,body) in F.items():
    open(R+f'assets/svg/{k}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 60 700 262" role="img" aria-label="{lab}">\n<style>{style}</style>\n{defs}\n<rect x="0" y="0" width="760" height="400" fill="#ffffff"/>\n{body}\n</svg>\n')
# gera o módulo do app a partir de TODOS os SVGs de assets/svg
out={}
for fn in sorted(os.listdir(R+'assets/svg')):
    s=open(R+'assets/svg/'+fn).read()
    vb=re.search(r'viewBox="([^"]+)"',s).group(1); lab=re.search(r'aria-label="([^"]+)"',s).group(1)
    body=re.sub(r'<style>.*?</style>|<defs>.*?</defs>|<rect x="0" y="0" width="760" height="400" fill="#ffffff"/>','',s.split('>',1)[1].rsplit('</svg>',1)[0],flags=re.S)
    body=re.sub(r'\s*\n\s*','',body).strip()
    out[fn[:-4]]={"viewBox":vb,"label":lab,"body":body}
ts='// GERADO a partir de assets/svg/*.svg (scripts/figuras.py). Não editar à mão.\n// Ilustrações dos exercícios no estilo do treino de quinta; as cores vêm das classes .i .a .e etc. em globals.css.\n'
ts+='export type Figure = { viewBox: string; label: string; body: string };\n'
ts+='export const FIGURES: Record<string, Figure> = '+json.dumps(out,ensure_ascii=False,indent=1)+';\n'
open(R+'web/lib/figures.ts','w').write(ts)
print(len(out), list(out))
