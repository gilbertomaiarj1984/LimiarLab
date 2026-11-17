import sys; sys.path.insert(0,'/home/claude/repo/scripts')
from figlib import *
F = {}

# ---------- auxiliares (prefixo br_) ----------
def br_person(dx=0, dy=0, arm=None, imp=None, leg="i", lean=0):
    """Em pé de lado; arm = [cotovelo, mão] absolutos (já com dx); imp = lista extra."""
    A,K,H,S,Hd = stand(dx,dy)
    o = [pl(leg,A,K,H), pl("i",H,S), head(*Hd)]
    if arm: o.append(pl("a",S,*arm))
    return o, S

def br_bar(x,y,kind="reta"):
    if kind=="reta": return rect(x-14,y-4,28,8,"w",3)
    return pl("w",(x-14,y+4),(x-7,y-4),(x+7,y+4),(x+14,y-4))

def br_post(x, top=80, wheel=None):
    o=[line(x,top,x,270)]
    if wheel: o.append(f'<circle class="e" cx="{x}" cy="{wheel}" r="6"/>')
    return o

def br_two(fn, a="Início", b="Fim", xa=200, xb=590, arrow=True):
    o=[ground(80,330), ground(460,710)]
    o += fn(0,1) + fn(380,2)
    o.append((ARROW if arrow else "") + labels(a,b,xa,xb).replace(ARROW,""))
    return "".join(o)

# ---------- 1 mergulho no banco ----------
def br_mergulho():
    def fr(dx,n):
        o=[rect(92+dx,230,66,8), line(104+dx,238,104+dx,270), line(148+dx,238,148+dx,270)]
        if n==1:
            sh=(146,170); hp=(162,218); kn=(204,234); an=(240,268); hand=(142,230); el=(144,200)
            hd=(150,153)
        else:
            sh=(142,196); hp=(160,242); kn=(204,248); an=(240,268); hand=(142,230); el=(122,214)
            hd=(146,179)
        o += [pl("i",hp,kn,an), pl("i",hp,sh), pl("a",sh,el,hand)]
        o.append(head(hd[0]+dx,hd[1]))
        # reposiciona pontos com dx
        return o
    # monta com dx aplicado manualmente
    o=[ground(80,330), ground(460,710)]
    for dx,(sh,hp,kn,an,el,hand,hd) in ((0,((146,172),(162,220),(204,236),(240,268),(144,202),(142,230),(150,155))),
                                         (380,((142,198),(160,244),(204,250),(240,268),(122,216),(142,230),(146,181)))):
        o += [rect(92+dx,230,66,8), line(104+dx,238,104+dx,270), line(148+dx,238,148+dx,270)]
        P=lambda p:(p[0]+dx,p[1])
        o += [pl("i",P(hp),P(kn),P(an)), pl("i",P(hp),P(sh)), pl("a",P(sh),P(el),P(hand)), head(*P(hd))]
    o.append(labels())
    return "".join(o)
F["mergulho-banco"] = ("Mergulho no banco: mãos no banco atrás do corpo, braços esticados no início e cotovelos dobrados com o quadril descendo no fim", br_mergulho())

# ---------- 2 tríceps barra polia ----------
def br_pushdown(kind="barra", band=False):
    o=[ground(80,330), ground(460,710)]
    for dx,hand,el in ((0,(214,166),(186,172)),(380,(194,204),(186,172))):
        A,K,H,S,Hd = stand(dx-10)
        S=(S[0],S[1]); e=(el[0]+dx-10,el[1]); h=(hand[0]+dx-10,hand[1])
        top=(240+dx,84)
        o += [line(top[0],70,top[0],270,"e") if False else line(top[0]+8,70,top[0]+8,270)]
        o += [f'<circle class="e" cx="{top[0]}" cy="84" r="6"/>']
        o += [pl("i",A,K,H), pl("i",H,S), head(*Hd)]
        o += [pl("a",S,e,h)]
        if band:
            o += [pl("e",(top[0]-2,84),(h[0]-2,h[1])), pl("e",(top[0]+2,84),(h[0]+2,h[1]))]
            o += [rect(h[0]-5,h[1]-4,10,8,"w",2)]
        elif kind=="barra":
            o += [line(top[0],90,h[0],h[1]), br_bar(h[0],h[1])]
        else:
            o += [line(top[0],90,h[0],h[1]), rect(h[0]-5,h[1]-4,10,8,"w",2)]
    o.append(labels())
    return "".join(o)
F["triceps-barra-polia"] = ("Tríceps na polia com barra: barra na altura do peito com cotovelos colados, depois braços estendidos para baixo", br_pushdown("barra"))

# ---------- 3 coice com halter ----------
def br_coice():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        hp=(160,192); sh=(206,186); hd=(222,180)
        o += [rect(186+dx,226,110,8), line(196+dx,234,196+dx,270), line(286+dx,234,286+dx,270)]
        o += [pl("i",P(hp),P((156,232)),P((150,268))), pl("i",P(hp),P((194,224)),P((160,226)))]
        o += [pl("i",P(hp),P(sh)), head(*P(hd)), pl("i",P(sh),P((228,206)),P((246,226)))]
        if not end:
            o += [pl("a",P(sh),P((176,184)),P((174,208))), db(174+dx,212,True)]
        else:
            o += [pl("a",P(sh),P((178,178)),P((148,180))), db(144+dx,180)]
    o.append(labels())
    return "".join(o)
F["triceps-coice-halter"] = ("Tríceps coice com halter: apoiado no banco, antebraço pendurado no início e cotovelo estendido para trás no fim", br_coice())

# ---------- 4 elástico alto ----------
F["triceps-elastico"] = ("Tríceps com elástico: elástico preso no alto, mãos junto ao peito no início e braços estendidos para baixo no fim", br_pushdown(band=True))

# ---------- 5 francês cabo ----------
def br_frances_cabo():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        hp=(170,190); sh=(186,144); hd=(194,128)
        o += [line(96+dx,80,96+dx,270), f'<circle class="e" cx="{100+dx}" cy="96" r="6"/>']
        o += [pl("i",P(hp),P((158,230)),P((140,268))), pl("i",P(hp),P((192,228)),P((214,268))), pl("i",P(hp),P(sh))]
        if not end:
            hand=(172,110); el=(206,116)
        else:
            hand=(232,102); el=(208,122)
        o += [pl("a",P(sh),P(el),P(hand)), line(*P((106,98)),*P(hand)), rect(hand[0]+dx-4,hand[1]-5,8,10,"w",2), head(*P(hd))]
    o.append(labels())
    return "".join(o)
F["triceps-frances-cabo"] = ("Tríceps francês no cabo: de costas para a polia, mãos atrás da cabeça com cotovelos dobrados no início e braços estendidos à frente e para cima no fim", br_frances_cabo())

# ---------- 6 francês elástico ----------
def br_frances_el():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        A,K,H,S,Hd = stand(dx)
        o += [pl("i",A,K,H), pl("i",H,S), rect(166+dx,266,36,5,"e",2)]
        if not end: el=(200,106); hand=(172,126)
        else: el=(188,110); hand=(182,80)
        o += [pl("e",P((168,268)),P(hand)), pl("a",S,P(el),P(hand)), rect(hand[0]+dx-4,hand[1]-4,8,8,"w",2), head(*Hd)]
    o.append(labels())
    return "".join(o)
F["triceps-frances-elastico"] = ("Tríceps francês com elástico: pisando no elástico, mãos atrás da cabeça no início e braços estendidos para cima no fim", br_frances_el())

# ---------- 7 francês unilateral halter ----------
def br_frances_uni():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        sh=(150,172); hp=(162,218); hd=(150,154)
        o += [rect(150+dx,222,76,8), line(160+dx,230,160+dx,270), line(214+dx,230,214+dx,270), rect(124+dx,118,8,108,"e",2)]
        o += [pl("i",P(hp),P((206,220)),P((208,262))), pl("i",P(hp),P(sh))]
        el=(164,142)
        o += [pl("i",P(sh),P((178,166)),P(el))]
        if not end:
            hand=(144,128); o += [pl("a",P(sh),P(el),P(hand)), db(hand[0]+dx-2,hand[1]+6,True)]
        else:
            hand=(168,112); o += [pl("a",P(sh),P(el),P(hand)), db(hand[0]+dx,hand[1]-8,True)]
        o += [head(*P(hd))]
    o.append(labels())
    return "".join(o)
F["triceps-frances-unilateral-halter"] = ("Tríceps francês unilateral com halter: sentado com encosto, halter atrás da cabeça com a outra mão no cotovelo no início e braço estendido para cima no fim", br_frances_uni())

# ---------- 8 testa com halteres ----------
def br_testa():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        o += [rect(110+dx,222,180,8), line(124+dx,230,124+dx,270), line(276+dx,230,276+dx,270)]
        o += [pl("i",P((242,214)),P((280,214)),P((284,266))), pl("i",P((242,214)),P((196,214))), head(*P((176,208)))]
        if not end:
            o += [pl("a",P((200,208)),P((200,178)),P((200,148))), db(200+dx,144)]
        else:
            o += [pl("a",P((200,208)),P((200,178)),P((174,176))), db(168+dx,176)]
    o.append(labels())
    return "".join(o)
F["triceps-testa-halteres"] = ("Tríceps testa com halteres: deitado, halteres acima do peito no início e antebraços dobrados levando os halteres ao lado da cabeça no fim", br_testa())

# ---------- 9 unilateral cabo ----------
def br_uni_cabo():
    o=[ground(80,330), ground(460,710)]
    for dx,hand in ((0,(214,166)),(380,(196,204))):
        A,K,H,S,Hd = stand(dx-10)
        h=(hand[0]+dx-10,hand[1]); e=(186+dx-10,172)
        o += [line(248+dx,70,248+dx,270), f'<circle class="e" cx="{240+dx}" cy="84" r="6"/>']
        o += [pl("i",A,K,H), pl("i",H,S), pl("i",S,(S[0]+14,S[1]+26),(H[0]+12,H[1]-2)), head(*Hd)]
        o += [line(240+dx,90,h[0],h[1]), pl("a",S,e,h), rect(h[0]-4,h[1]-5,8,10,"w",2)]
    o.append(labels())
    return "".join(o)
F["triceps-unilateral-cabo"] = ("Tríceps unilateral na polia: uma mão no pegador com cotovelo colado, antebraço para cima no início e braço estendido para baixo no fim", br_uni_cabo())

# ---------- roscas em pé ----------
def br_curl(imp, start, end, extra=None, a="Início", b="Fim", lean2=0, arrow=True):
    o=[ground(80,330), ground(460,710)]
    for dx,(el,hand),lean in ((0,start,0),(380,end,lean2)):
        A,K,H,S,Hd = stand(dx)
        if lean:
            S=(S[0]-lean,S[1]); Hd=(Hd[0]-lean-2,Hd[1])
            o += [pl("i",A,K,H), pl("i",H,S), head(*Hd)]
        else:
            o += [pl("i",A,K,H), pl("i",H,S), head(*Hd)]
        e=(el[0]+dx,el[1]); h=(hand[0]+dx,hand[1])
        if lean: e=(e[0]-lean,e[1]); h=(h[0]-lean,h[1])
        if extra: o += extra(dx,e,h)
        o += [pl("a",S,e,h)]
        o += imp(dx,e,h)
    o.append((ARROW if arrow else "") + labels(a,b,200,590).replace(ARROW,"")) if False else o.append(labels(a,b,200,590) if (a,b)==("Início","Fim") else ARROW+labels(a,b,200,590))
    return "".join(o)

# 10 alternada
def br_alt():
    o=[ground(80,330), ground(460,710)]
    for dx,cur in ((0,False),(380,True)):
        A,K,H,S,Hd = stand(dx)
        o += [pl("i",A,K,H), pl("i",H,S), head(*Hd)]
        o += [pl("i",S,(S[0]+4,S[1]+30),(S[0]+6,S[1]+60)), db(S[0]+6+dx*0,S[1]+66,True)]
        if not cur: o += [pl("a",S,(S[0]-4,S[1]+30),(S[0]-6,S[1]+58)), db(S[0]-6,S[1]+64,True)]
        else: o += [pl("a",S,(S[0]-4,S[1]+30),(S[0]+20,S[1]+12)), db(S[0]+24,S[1]+8,True)]
    o.append(labels())
    return "".join(o)
F["rosca-alternada-halteres"] = ("Rosca alternada com halteres: braços estendidos ao lado do corpo no início e um braço flexionado com o halter no ombro no fim, o outro parado", br_alt())

# 11 barra reta: certo / evite
def br_barra_reta():
    o=[ground(80,330), ground(460,710)]
    A,K,H,S,Hd = stand(0)
    o += [pl("i",A,K,H), pl("i",H,S), head(*Hd), pl("a",S,(192,170),(216,152)), br_bar(220,150)]
    # evite: tronco jogado para trás e quadril à frente
    H2=(584,186); S2=(560,146); Hd2=(556,130)
    o += [pl("i",(580,268),(586,228),H2), pl("i",H2,S2), head(*Hd2), pl("a",S2,(572,176),(598,160)), br_bar(602,158)]
    o += ['<path class="x" d="M640 120l16 16M656 120l-16 16"/>']
    o.append(ARROW + labels("Certo","Evite",200,590))
    return "".join(o)
F["rosca-barra-reta"] = ("Rosca com barra reta: à esquerda o movimento correto com tronco parado, à direita o erro de jogar o tronco para trás", br_barra_reta())

# 12 barra W
def br_barra_w():
    imp=lambda dx,e,h: [br_bar(h[0],h[1],"w")]
    return br_curl(imp,((196,170),(200,198)),((190,170),(216,150)))
F["rosca-barra-w"] = ("Rosca com barra W: barra na altura das coxas com cotovelos ao lado do corpo no início e barra elevada à altura do ombro no fim", br_barra_w())

# 13 rosca no cabo (polia baixa)
def br_cabo():
    def imp(dx,e,h):
        return [line(h[0],h[1],268+dx,262), br_bar(h[0],h[1])]
    def extra(dx,e,h): return []
    o=br_curl(imp,((194,170),(204,198)),((192,170),(216,150)))
    # polia
    o = o.replace("<text", "<text",1)
    pul = "".join(f'<circle class="e" cx="{268+dx}" cy="262" r="6"/>'+line(274+dx,250,274+dx,270)+rect(262+dx,262,24,8,"e",2) for dx in (0,380))
    return o + pul
F["rosca-cabo"] = ("Rosca no cabo: de frente para a polia baixa com cotovelos fixos, braços estendidos no início e barra elevada no fim", br_cabo())

# 14 elástico
def br_elastico():
    def imp(dx,e,h):
        return [pl("e",(190+dx,266),h), pl("e",(196+dx,266),(h[0]+3,h[1])), rect(h[0]-4,h[1]-4,8,8,"w",2)]
    return br_curl(imp,((194,170),(204,198)),((192,170),(218,148)))
F["rosca-elastico"] = ("Rosca com elástico: pisando no elástico, braços estendidos no início e mãos elevadas aos ombros no fim", br_elastico())

# 15 inclinada
def br_inclinada():
    o=[ground(80,330), ground(460,710)]
    for dx,cur in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        o += [pl("e",P((180,226)),P((120,162))), pl("e",P((180,226)),P((244,226))), line(214+dx,226,214+dx,270), line(130+dx,172,116+dx,270)]
        o += [pl("i",P((190,214)),P((232,218)),P((236,264))), pl("i",P((190,214)),P((152,174))), head(*P((142,158)))]
        if not cur: o += [pl("a",P((152,174)),P((152,204)),P((152,234))), db(152+dx,240,True)]
        else: o += [pl("a",P((152,174)),P((152,204)),P((178,190))), db(182+dx,186,True)]
    o.append(labels())
    return "".join(o)
F["rosca-inclinada-halteres"] = ("Rosca no banco inclinado com halteres: braços pendurados atrás da linha do tronco no início e halteres elevados sem mover os cotovelos no fim", br_inclinada())

# 16 inversa W
def br_inversa():
    imp=lambda dx,e,h: [br_bar(h[0],h[1]-7,"w")]
    o = br_curl(imp,((196,170),(204,198)),((190,170),(214,152)),arrow=False,a="Início · palmas p/ baixo",b="Fim")
    return o
F["rosca-inversa-barra-w"] = ("Rosca inversa com barra W: pegada com palmas para baixo, barra nas coxas no início e elevada sem dobrar o punho no fim", br_inversa())

# 17 martelo corda
def br_mart_corda():
    def imp(dx,e,h):
        return [line(h[0],h[1],268+dx,262), pl("w",(h[0]-3,h[1]+8),(h[0],h[1]),(h[0]+3,h[1]-8)), pl("w",(h[0],h[1]),(h[0]+12,h[1]+6))]
    o=br_curl(imp,((194,170),(204,198)),((192,170),(216,150)))
    pul = "".join(f'<circle class="e" cx="{268+dx}" cy="262" r="6"/>'+rect(262+dx,262,24,8,"e",2) for dx in (0,380))
    return o+pul
F["rosca-martelo-corda"] = ("Rosca martelo na polia com corda: pegada neutra, braços estendidos de frente para a polia baixa no início e corda elevada no fim", br_mart_corda())

# 18 martelo cruzada (de frente)
def br_mart_cruz():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        o += front(dx,[],[(214+dx,166),(214+dx,196)],c="i")
        if not end:
            o += [pl("a",(172+dx,136),(168+dx,166),(168+dx,196)), rect(163+dx,196,10,10,"w",2)]
        else:
            o += [pl("a",(172+dx,136),(170+dx,166),(198+dx,150)), rect(198+dx,145,10,10,"w",2)]
    o.append(labels())
    return "".join(o)
F["rosca-martelo-cruzada"] = ("Rosca martelo cruzada vista de frente: halter ao lado da coxa no início e levado em diagonal ao ombro oposto no fim", br_mart_cruz())

# 19 martelo elástico (de frente)
def br_mart_el():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        lh=(166+dx,196) if not end else (170+dx,140)
        rh=(214+dx,196) if not end else (210+dx,140)
        le=(168+dx,166); re_=(212+dx,166)
        o += front(dx,[],[],c="i")
        o += [rect(170+dx,266,12,5,"e",2), rect(198+dx,266,12,5,"e",2)]
        o += [pl("e",(176+dx,266),lh), pl("e",(204+dx,266),rh)]
        o += [pl("a",(172+dx,136),le,lh), pl("a",(208+dx,136),re_,rh), rect(lh[0]-4,lh[1]-4,8,8,"w",2), rect(rh[0]-4,rh[1]-4,8,8,"w",2)]
    o.append(labels())
    return "".join(o)
F["rosca-martelo-elastico"] = ("Rosca martelo com elástico vista de frente: pisando no elástico com pegada neutra, mãos ao lado das coxas no início e elevadas aos ombros no fim", br_mart_el())

# 20 scott
def br_scott():
    o=[ground(80,330), ground(460,710)]
    for dx,end in ((0,False),(380,True)):
        P=lambda p:(p[0]+dx,p[1])
        o += [rect(106+dx,224,70,8), line(124+dx,232,124+dx,270), pl("e",P((158,180)),P((216,220))), line(216+dx,220,216+dx,270)]
        o += [pl("i",P((130,218)),P((176,218)),P((178,264))), pl("i",P((130,218)),P((146,172))), head(*P((148,156)))]
        if not end: el=(176,194); hand=(206,208)
        else: el=(176,194); hand=(166,166)
        o += [pl("a",P((146,174)),P(el),P(hand)), rect(hand[0]+dx-4,hand[1]-6,8,12,"w",2)]
    o.append(labels())
    return "".join(o)
F["rosca-scott-maquina"] = ("Rosca Scott: braços apoiados no banco inclinado, quase estendidos no início e antebraços flexionados rumo aos ombros no fim", br_scott())
