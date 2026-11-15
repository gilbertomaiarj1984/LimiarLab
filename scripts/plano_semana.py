# Gera web/fixtures/plano-2026-11-16.json (plano de força da semana + treinos de data/treinos).
# Uso (na raiz do repo): python3 scripts/plano_semana.py
import json,sys,re,os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
rng=lambda v,suf='': (f"{v[0]}–{v[1]}{suf}" if isinstance(v,list) else f"{v}{suf}")
def conv(slug):
    d=json.load(open(R+f'data/treinos/{slug}.json'))
    ex=[]
    for e in d['exercicios']:
        if 'reps' in e:
            reps=str(e['reps']).replace('-', '–') if not isinstance(e['reps'],list) else rng(e['reps'])
        else:
            reps=rng(e['duracao_s'],' s')
        if e.get('unidade'): reps+=' '+e['unidade']
        x={"name":e['nome'],"sets":e['series'],"reps":reps}
        if e.get('carga_pct_1rm'): x['load']=rng(e['carga_pct_1rm'],'% 1RM')
        elif e.get('carga'): x['load']=e['carga']
        if e.get('ilustracao'): x['figure']=e['ilustracao'].rsplit('/',1)[1][:-4]
        if isinstance(e.get('descanso_s'),int): x['rest_s']=e['descanso_s']
        if e.get('foco'): x['focus']=e['foco']
        if e.get('dicas'): x['tips']=e['dicas']
        if e.get('variacao'): x['alternative']=e['variacao']
        ex.append(x)
    w={"slug":slug,"title":d['nome'],"exercises":ex}
    if d.get('objetivo'): w['goal']=d['objetivo']
    if d.get('duracao_min'): w['duration']=rng(d['duracao_min'],' min')
    if d.get('rir'): w['rir']=rng(d['rir'])
    if d.get('descanso_s'): w['rest']=rng(d['descanso_s'],' s')
    if d.get('aquecimento'): w['warmup']=d['aquecimento']
    if d.get('nota_carga'): w['load_note']=re.sub(r'(\d)-(\d)', r'\1–\2', d['nota_carga'])
    if d.get('referencia'): w['reference']=d['referencia']
    if d.get('acessorios_opcionais'): w['load_note']=(w.get('load_note','')+' Acessórios opcionais: '+', '.join(d['acessorios_opcionais'])+'.').strip()
    return w
slugs=['superiores-segunda','inferiores-terca','superiores-quarta','inferiores-quinta']
L=lambda eid,date,kind,title,**k: dict(source="limiarlab",external_id=eid,date=date,sport=k.pop('sport','strength'),kind=kind,title=title,**k)
planned=[
 L("2026-11-16-sup","2026-11-16","forca_superiores","Superiores A: costas e peito",workout="superiores-segunda"),
 L("2026-11-17-inf","2026-11-17","forca_inferiores","Inferiores pesado",notes="À noite, depois do intervalado da manhã: dia duro fica duro.",workout="inferiores-terca"),
 L("2026-11-18-sup","2026-11-18","forca_superiores","Superiores B: costas, ombros e core",workout="superiores-quarta"),
 L("2026-11-19-inf","2026-11-19","forca_inferiores","Inferiores leve",notes="Curto e sem chegar perto da falha: a corrida da manhã tem 20 min de areia fofa e o longão é no sábado.",workout="inferiores-quinta"),
 L("2026-11-20-opc","2026-11-20","forca_superiores","Opcional: superiores, ou descanso total",optional=True),
 L("2026-11-22-desc","2026-11-22","descanso","Descanso",sport="other"),
]
out={"athlete":"giba","_comment":"Plano de força da semana de 16/11/2026 (plano semanal do LimiarLab) com os treinos detalhados de data/treinos/. As corridas da semana vêm do Garmin (atualizacao-2026-11-15.json).",
 "planned_replace":[{"source":"limiarlab","from":"2026-11-16","to":"2026-11-22"}],"planned":planned,"activities":[],"workouts":[conv(s) for s in slugs]}
json.dump(out,open(R+'web/fixtures/plano-2026-11-16.json','w'),ensure_ascii=False,indent=2); open(R+'web/fixtures/plano-2026-11-16.json','a').write("\n")
print(json.dumps(out['workouts'][3]['exercises'][0],ensure_ascii=False)); print(json.dumps(out['workouts'][1]['exercises'][4],ensure_ascii=False)); print(out['workouts'][1].get('load_note'))
