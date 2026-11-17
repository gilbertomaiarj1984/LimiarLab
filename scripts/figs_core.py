import sys; sys.path.insert(0,'/home/claude/repo/scripts')
from figlib import *
import math
F = {}

def cr_gr(): return [ground(80,330), ground(460,710)]
def cr_lab(a="Início", b="Fim", xa=190, xb=580): return ARROW + f'<text class="t" x="{xa}" y="310">{a}</text><text class="t" x="{xb}" y="310">{b}</text>'
def cr_up(x, y1=252, y2=200): return f'<path class="e" d="M{x} {y1}V{y2}" marker-end="url(#arr)"/>'
def cr_kb(x, y):  # kettlebell: alça no topo em (x,y-7)
    return pl("e",(x-6,y+1),(x-6,y-7),(x+6,y-7),(x+6,y+1)) + f'<circle class="w" cx="{x}" cy="{y+9}" r="9"/>'
def cr_rot(p, ang, c):
    a = math.radians(ang); x, y = p[0]-c[0], p[1]-c[1]
    return (round(c[0]+x*math.cos(a)-y*math.sin(a),1), round(c[1]+x*math.sin(a)+y*math.cos(a),1))

def cr_cfront(cx, dy=0, lean=0, trunkc="i", legc="i", armL=None, armR=None, armc="i", sp=0, lfoot=None):
    hy=190+dy; shx=cx+lean; sy=136+dy+abs(lean)*0.15
    o=[pl(legc,(cx-10,hy),(cx-10-sp/2,hy+38),(cx-9-sp,268+dy)),
       pl(legc,(cx+10,hy),(cx+10+sp/2,hy+38),(cx+9+sp,268+dy)),
       pl("i",(cx-10,hy),(cx+10,hy)), pl(trunkc,(cx,hy),(shx,sy)),
       pl("i",(shx-18,sy),(shx+18,sy)), head(shx+lean*0.25, sy-22)]
    if armL: o.append(pl(armc,(shx-18,sy),*armL))
    if armR: o.append(pl(armc,(shx+18,sy),*armR))
    return o

# ---------- PLIOMETRIA ----------
def cr_afundo():
    o=cr_gr()
    o += [pl("a",(232,268),(228,226),(188,222)), pl("a",(188,222),(170,260),(132,262)), pl("i",(188,222),(190,174)),
          pl("i",(190,174),(204,196),(222,184)), head(191,158)]
    o += [pl("a",(612,236),(612,196),(578,186)), pl("a",(578,186),(560,214),(530,204)), pl("i",(578,186),(580,138)),
          pl("i",(580,138),(558,158),(546,140)), head(581,122), cr_up(680,250,196)]
    return "".join(o)+cr_lab("Afundo","Salto e troca")
F["afundo-saltado"] = ("Afundo com salto: posição baixa do afundo e troca de pernas no ar", cr_afundo())

def cr_pogo_uni():
    o=cr_gr()
    for dx,dy in ((0,0),(390,-28)):
        A,K,H,S,Hd = stand(dx,dy)
        o += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,(H[0]-12,H[1]+36),(H[0]-44,H[1]+52)),
              pl("i",H,S), pl("i",S,(S[0]-4,S[1]+28),(S[0]+14,S[1]+44)), head(*Hd)]
    o += [cr_up(630,252,196), f'<path class="e" d="M660 196V252" marker-end="url(#arr)"/>']
    return "".join(o)+labels("Apoio curto","No ar",200,590)
F["pogo-unilateral"] = ("Pogo unilateral: apoio numa perna e fase no ar", cr_pogo_uni())

def cr_corda():
    o=cr_gr()
    A,K,H,S,Hd = stand(0,0)
    o += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(204,164),(220,152)), head(*Hd),
          '<path class="e" d="M220 152C292 150 276 62 198 62C128 62 104 150 148 214"/>']
    A,K,H,S,Hd = stand(390,-10)
    o += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(594,154),(610,142)), head(*Hd),
          '<path class="e" d="M610 142C690 170 676 280 586 278C512 276 494 200 546 160"/>']
    return "".join(o)+labels("Corda no alto","Corda sob os pés",190,580)
F["pular-corda"] = ("Pular corda: corda no alto e corda passando sob os pés no salto", cr_corda())

def cr_lateral_linha():
    o=cr_gr()+[line(190,248,190,282,"d"), line(580,248,580,282,"d")]
    o += cr_cfront(155,0,legc="a",armL=[(130,166),(136,188)],armR=[(176,166),(172,188)])
    o += cr_cfront(615,-8,legc="a",armL=[(590,166-8),(596,188-8)],armR=[(636,158),(632,180)])
    return "".join(o)+labels("Início","Fim",190,570)
F["saltitos-laterais-linha"] = ("Saltitos laterais na linha: pés juntos de um lado da linha e depois do outro, vista de frente", cr_lateral_linha())

def cr_drop():
    o=cr_gr()+[rect(120,240,90,30), rect(480,240,90,30)]
    A,K,H,S,Hd = stand(0,-30)
    o += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(186,170),(180,190)), head(*Hd)]
    A,K,H,S,Hd = stand(440,-40)
    o += [pl("a",(A[0]+10,A[1]-6),(A[0]+2,A[1]),K,H), pl("i",H,S), pl("i",S,(S[0]+14,S[1]-20),(S[0]+22,S[1]-42)), head(*Hd), cr_up(690,252,196)]
    return "".join(o)+cr_lab("Sobre a caixa","Rebote",170,630)
F["salto-profundidade"] = ("Salto em profundidade: em pé sobre a caixa e rebote no ar após tocar o chão", cr_drop())

def cr_bounding():
    o=cr_gr()
    o += [pl("a",(190,268),(190,228),(190,188)), pl("a",(190,188),(224,166),(222,206)), pl("i",(190,188),(190,140)),
          pl("i",(190,140),(168,160),(158,144)), pl("i",(190,140),(212,152),(226,138)), head(191,124)]
    o += [pl("a",(580,168),(618,176),(656,196)), pl("a",(580,168),(556,206),(526,190)), pl("i",(580,168),(580,120)),
          pl("i",(580,120),(604,140),(622,124)), pl("i",(580,120),(556,134),(544,118)), head(581,104), cr_up(690,252,206)]
    return "".join(o)+cr_lab("Impulsão","Voo",190,580)
F["saltos-alternados"] = ("Saltos alternados (bounding): impulsão com joelho da frente alto e fase de voo com passada longa", cr_bounding())

def cr_skater_fig(m):
    X = (lambda x: 800-x) if m else (lambda x: x)
    def P(*pts): return [(X(x),y) for x,y in pts]
    o=[pl("a",*P((168,268),(170,230),(176,192))), pl("i",*P((176,192),(198,224),(214,244))), pl("i",*P((166,192),(186,192))),
       pl("i",*P((176,192),(188,142))), pl("i",*P((170,142),(206,142))), head(X(190),120),
       pl("i",*P((170,142),(150,166),(166,184))), pl("i",*P((206,142),(224,158),(238,148)))]
    return o
def cr_skater():
    o=cr_gr()+cr_skater_fig(False)+cr_skater_fig(True)
    return "".join(o)+cr_lab("Aterrissa e segura","Salta ao outro lado",190,580)
F["saltos-laterais-skater"] = ("Saltos laterais de patinador: aterrissagem numa perna com a outra cruzada atrás, depois salto para o lado oposto", cr_skater())

def cr_step():
    o=cr_gr()+[rect(220,258,80,12), rect(610,258,80,12)]
    A,K,H,S,Hd = stand(0,0)
    o += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(S[0]+4,S[1]+28),(S[0]+14,S[1]+44)), head(*Hd)]
    A,K,H,S,Hd = stand(430,-12)
    o += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(S[0]+4,S[1]+28),(S[0]+14,S[1]+44)), head(*Hd)]
    return "".join(o)+labels("No chão","No step",190,580)+ARROW
F["saltos-step-baixo"] = ("Saltitos no step baixo: pés no chão ao lado do step e depois os dois pés sobre o step", cr_step())

# ---------- CORE ----------
def cr_deadbug():
    o=cr_gr()
    for dx in (0,380):
        o += [pl("a",(150+dx,262),(192+dx,262)), head(120+dx,258)]
    o += [pl("i",(150,262),(150,204)), pl("i",(192,262),(192,222),(232,222))]
    o += [pl("i",(530,262),(530,204)), pl("i",(572,262),(572,222),(612,222)),
          pl("a",(530,262),(494,238),(462,244)), pl("a",(572,262),(612,252),(652,246))]
    return "".join(o)+labels("Início","Fim",190,570)
F["dead-bug"] = ("Dead bug deitado de costas: braços e joelhos a 90 graus para cima; depois braço e perna opostos estendidos sem descolar a lombar", cr_deadbug())

def cr_plank(dx, sag=0, wide=False):
    ank=(112+dx,264); knee=(149+dx,247+sag*0.5); hip=(185+dx,230+sag); S=(232+dx,208); hand=(232+dx,268)
    o=[pl("i",ank,knee,hip), pl("a",hip,S), head(248+dx,196), pl("i",S,hand), pl("i",(ank[0]-8,ank[1]),ank)]
    if wide: o.append(pl("i",(ank[0]+22,ank[1]-2),(ank[0]+2,ank[1]-4)))
    return o

def cr_prancha_alta():
    o=cr_gr()+cr_plank(0)+cr_plank(390,sag=16)
    o += [line(502,264,622,208,"d"), '<circle class="x" cx="575" cy="248" r="14"/>']
    return "".join(o)+labels("Certo","Evite",190,580)
F["prancha-alta"] = ("Prancha alta: corpo em linha reta (certo) e quadril caído (evite), vista lateral", cr_prancha_alta())

def cr_roda():
    o=cr_gr()
    o += [pl("i",(80,268),(122,268)), pl("i",(122,268),(122,228)), pl("a",(122,228),(160,196)), head(174,184),
          pl("i",(160,196),(190,250)), f'<circle class="w" cx="190" cy="252" r="18"/>']
    o += [pl("i",(430,268),(470,268)), pl("i",(470,268),(508,254)), pl("a",(508,254),(554,238)), head(572,231),
          pl("i",(554,238),(614,252)), f'<circle class="w" cx="614" cy="252" r="18"/>']
    return "".join(o)+labels("Início","Fim",190,570)
F["roda-abdominal"] = ("Roda abdominal ajoelhado: roda sob os ombros e depois o corpo estendido à frente com a lombar neutra", cr_roda())

def cr_flex_lateral():
    o=cr_gr()+[line(190,100,190,190,"d"), line(580,100,580,190,"d")]
    o += cr_cfront(190,0,0,"a","i",[(170,160),(176,190)],[(212,166),(214,196)])+[db(214,200,True)]
    o += cr_cfront(580,0,34,"a","i",[(596,168),(590,190)],[(638,170),(640,200)])+[db(640,204,True)]
    return "".join(o)+labels("Início","Fim",190,580)
F["flexao-lateral-halter"] = ("Flexão lateral com halter: em pé com o halter ao lado e depois o tronco dobrado para o lado do peso, vista de frente", cr_flex_lateral())

def cr_copenhagen():
    o=cr_gr()+[rect(264,228,70,42), rect(654,228,70,42)]
    o += [pl("i",(126,262),(126,226)), pl("i",(126,226),(174,246)), head(108,220), pl("i",(174,246),(214,236),(262,226)),
          pl("a",(174,246),(210,258),(248,264)), pl("i",(126,226),(150,208),(172,236))]
    o += [pl("i",(516,262),(516,224)), pl("i",(516,224),(564,224)), head(498,220), pl("i",(564,224),(610,226),(656,228)),
          pl("a",(564,224),(610,236),(654,242)), pl("i",(516,224),(540,204),(562,222))]
    return "".join(o)+labels("Início","Fim",190,570)
F["prancha-copenhagen"] = ("Prancha Copenhagen vista de frente: perna de cima apoiada no banco, perna de baixo pendurada e depois elevada junto à de cima", cr_copenhagen())

def cr_side(dx, mode):
    S=(126+dx,230); E=(126+dx,266)
    base=[pl("i",S,E), head(108+dx,224)]
    if mode=="abd0":
        hip=(172+dx,244); k=(211+dx,256); a=(252+dx,268)
        return base+[pl("a",S,hip), pl("i",hip,k,a), pl("i",hip,(k[0],k[1]-2),(a[0],a[1]-3)), pl("i",S,(150+dx,214),(172+dx,236))]
    if mode=="abd1":
        hip=(172+dx,244); k=(211+dx,256); a=(252+dx,268)
        return base+[pl("a",S,hip), pl("i",hip,k,a), pl("a",hip,(205+dx,221),(238+dx,198)), pl("i",S,(150+dx,214),(172+dx,236))]
    if mode=="kn0":
        hip=(172+dx,256); k=(212+dx,265)
        return base+[pl("a",S,hip), pl("i",hip,k), pl("i",k,(228+dx,270))]
    hip=(171+dx,247); k=(210+dx,261)
    return base+[pl("a",S,hip), pl("i",hip,k), pl("i",k,(226+dx,270)), pl("i",S,(150+dx,214),(171+dx,238))]
def cr_lat_abd():
    return "".join(cr_gr()+cr_side(0,"abd0")+cr_side(390,"abd1"))+labels("Início","Perna elevada",190,580)+ARROW
F["prancha-lateral-com-abducao"] = ("Prancha lateral vista de frente: pés empilhados e depois a perna de cima elevada", cr_lat_abd())
def cr_lat_kn():
    return "".join(cr_gr()+cr_side(0,"kn0")+cr_side(390,"kn1"))+labels("Quadril baixo","Quadril alto",190,580)+ARROW
F["prancha-lateral-joelhos"] = ("Prancha lateral apoiada nos joelhos: quadril baixo e depois quadril elevado em linha do ombro ao joelho", cr_lat_kn())

def cr_suitcase_hold():
    o=cr_gr()+[line(190,90,190,268,"d"), line(580,90,580,268,"d")]
    o += cr_cfront(190,0,0,"a","i",[(170,160),(176,190)],[(212,166),(212,196)])+[db(212,200,True)]
    o += cr_cfront(580,0,22,"a","i",[(594,160),(594,190)],[(640,166),(640,196)])+[db(640,200,True), '<circle class="x" cx="596" cy="158" r="16"/>']
    return "".join(o)+labels("Certo","Evite",190,580)
F["suitcase-hold"] = ("Suitcase hold: em pé com o halter numa mão e tronco reto (certo) ou inclinado para o lado do peso (evite)", cr_suitcase_hold())

def cr_birddog():
    o=cr_gr()
    for dx in (0,390):
        H=(168+dx,226); S=(216+dx,208)
        o += [pl("i",S,(216+dx,268)), pl("i",H,(168+dx,266),(128+dx,266)), pl("a",H,S), head(234+dx,190)]
    o += [pl("a",(216,208),(216,268)), pl("a",(168,226),(168,266),(128,266))]
    o += [pl("a",(606,208),(636,206),(666,204)), pl("a",(558,226),(518,224),(478,222))]
    return "".join(o)+labels("Início","Fim",190,580)
F["bird-dog"] = ("Bird dog em quatro apoios: apoio inicial e depois braço e perna opostos estendidos, tronco nivelado", cr_birddog())

def cr_lenhador():
    o=[ground(80,330), ground(460,710)]
    for dx in (0,380):
        o += [line(104+dx,66,104+dx,270), f'<circle class="e" cx="{104+dx}" cy="74" r="6"/>']
    o += cr_cfront(190,0,0,"a","i")
    o += [pl("a",(172,136),(168,110),(170,84)), pl("a",(208,136),(196,108),(170,84)), line(110,74,170,84)]
    o += cr_cfront(570,0,10,"a","i")
    o += [pl("a",(562,138),(592,166),(602,194)), pl("a",(598,138),(616,166),(602,194)), line(484,74,602,194)]
    return "".join(o)+labels("Polia alta","Diagonal para baixo",190,580)+ARROW
F["lenhador-cabo"] = ("Lenhador no cabo: mãos junto à polia alta e depois puxadas na diagonal para baixo do lado oposto, tronco girando", cr_lenhador())

def cr_zig(x0,y0,x1,y1,n=8):
    dx,dy=x1-x0,y1-y0; L=math.hypot(dx,dy); nx,ny=-dy/L,dx/L
    return pl("e",*[(round(x0+dx*i/n+(4 if i%2 else -4)*nx*(0 if i in (0,n) else 1),1), round(y0+dy*i/n+(4 if i%2 else -4)*ny*(0 if i in (0,n) else 1),1)) for i in range(n+1)])
def cr_pallof_el():
    o=[]
    for dx in (0,380):
        o += [rect(92+dx,168,16,16), f'<circle class="h" cx="{200+dx}" cy="204" r="13"/>', pl("i",(168+dx,204),(232+dx,204))]
    o += [pl("a",(168,204),(182,184),(200,178)), pl("a",(232,204),(218,184),(200,178)), cr_zig(108,178,200,178)]
    o += [pl("a",(548,204),(564,160),(580,124)), pl("a",(612,204),(596,160),(580,124)), cr_zig(488,178,580,124)]
    return "".join(o)+labels("Início (visto de cima)","Fim",190,570)
F["pallof-elastico"] = ("Pallof press com elástico visto de cima: mãos junto ao peito e depois braços estendidos à frente sem girar", cr_pallof_el())

def cr_pallof_mk():
    o=[]
    for dx in (0,390):
        o += [line(86+dx,70,86+dx,270), f'<circle class="e" cx="{86+dx}" cy="186" r="6"/>']
    o += cr_gr()
    for dx in (0,390):
        o += [pl("i",(110+dx,266),(152+dx,266)), pl("a",(152+dx,266),(152+dx,226)), pl("a",(152+dx,226),(192+dx,226),(194+dx,268)),
              pl("a",(152+dx,226),(152+dx,178)), head(153+dx,162)]
    o += [line(92,186,188,186), pl("i",(152,178),(166,198),(188,186))]
    o += [line(482,186,606,186), pl("i",(542,178),(574,182),(606,186))]
    return "".join(o)+labels("Início","Fim",190,580)
F["pallof-meio-ajoelhado"] = ("Pallof press meio ajoelhado: joelho de trás no chão, mãos ao peito e depois braços estendidos à frente contra o cabo lateral", cr_pallof_mk())

def cr_rowplank():
    o=cr_gr()+cr_plank(0,wide=True)+cr_plank(390,wide=True)
    o += [db(232,264), pl("a",(232,208),(232,268))]
    o += [db(622,264), pl("a",(622,208),(594,198),(610,224)), db(612,230)]
    return "".join(o)+labels("Início","Remada",190,580)+ARROW
F["prancha-remada-halter"] = ("Prancha com remada alternada: mãos nos halteres e depois um halter puxado ao lado do tronco sem girar o quadril", cr_rowplank())

def cr_touch():
    o=cr_gr()+cr_plank(0,wide=True)+cr_plank(390,wide=True)
    o += [pl("a",(232,208),(232,268))]
    o += [pl("a",(622,208),(648,226),(630,210))]
    return "".join(o)+labels("Início","Toque no ombro",190,580)+ARROW
F["prancha-toque-ombro"] = ("Prancha alta com toque no ombro: dois apoios e depois uma mão tocando o ombro oposto sem balançar o quadril", cr_touch())

def cr_rotmaq():
    o=[]
    for dx,ang in ((0,-35),(390,35)):
        c=(200+dx,214); R=lambda p: cr_rot((p[0]+dx,p[1]),ang,c)
        o += [rect(146+dx,246,18,12), rect(236+dx,246,18,12), pl("i",(176+dx,232),(224+dx,232))]
        o += [pl("a",R((172,208)),R((228,208))), pl("a",(200+dx,232),R((200,208))), f'<circle class="h" cx="{R((200,190))[0]}" cy="{R((200,190))[1]}" r="12"/>']
        o += [pl("a",R((172,208)),R((190,176)),R((200,160))), pl("a",R((228,208)),R((210,176)),R((200,160))), pl("e",R((160,160)),R((240,160)))]
    return "".join(o)+cr_lab("Gira para um lado","Gira para o outro",190,580)
F["rotacao-tronco-maquina"] = ("Rotação de tronco na máquina vista de cima: quadril fixo e ombros girando para um lado e depois para o outro", cr_rotmaq())

def cr_russian():
    o=cr_gr()
    for dx,s in ((0,-1),(390,1)):
        o += [pl("i",(180+dx,258),(172+dx,226),(174+dx,246)), pl("i",(200+dx,258),(208+dx,226),(206+dx,246)), pl("i",(180+dx,258),(200+dx,258)),
              pl("a",(190+dx,258),(190+dx,208)), pl("a",(178+dx+s*4,208),(202+dx+s*4,208)), head(190+dx,188)]
        hx=190+dx+s*40
        o += [pl("i",(190+dx+s*4+(-14 if s<0 else 14),208),(190+dx+s*22,232),(hx,238)), db(hx,240)]
    return "".join(o)+labels("Gira para um lado","Gira para o outro",190,580)+ARROW
F["russian-twist"] = ("Russian twist sentado, vista de frente: tronco girando com as mãos de um lado e depois do outro", cr_russian())

def cr_farmer():
    o=cr_gr()
    o += [pl("i",(224,266),(208,228),(190,188)), pl("i",(152,258),(180,228),(190,188)), pl("a",(190,188),(190,140)), head(191,124), pl("a",(190,140),(190,170),(191,198)), db(191,204,True)]
    o += [pl("i",(580,268),(580,228),(580,188)), pl("i",(580,188),(596,214),(588,248)), pl("a",(580,188),(580,140)), head(581,124), pl("a",(580,140),(580,170),(581,198)), db(581,204,True)]
    return "".join(o)+labels("Passo","Passagem",190,580)+ARROW
F["farmer-walk"] = ("Caminhada do fazendeiro, vista lateral: halteres ao lado do corpo, tronco alto, passo e passagem", cr_farmer())

def cr_suitcase_kb():
    o=cr_gr()+[line(190,90,190,268,"d"), line(580,90,580,268,"d")]
    o += cr_cfront(190,0,0,"a","i",[(170,160),(176,190)],[(212,166),(212,192)],sp=14)+[cr_kb(212,200)]
    o += cr_cfront(580,0,22,"a","i",[(594,160),(594,190)],[(640,166),(640,192)],sp=14)+[cr_kb(640,200), '<circle class="x" cx="596" cy="158" r="16"/>']
    return "".join(o)+labels("Certo","Evite",190,580)
F["suitcase-carry-kettlebell"] = ("Suitcase carry com kettlebell, vista de frente: tronco reto (certo) ou inclinado para o lado do peso (evite)", cr_suitcase_kb())

def cr_waiter():
    o=cr_gr()
    A,K,H,S,Hd = stand(0,0)
    o += [pl("i",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("a",S,(196,110),(198,78)), db(198,72), head(184,126)]
    o += [pl("i",(590,266),(582,228),(570,188)), pl("i",(548,258),(560,228),(570,188)), pl("a",(570,188),(572,166),(566,142)), head(558,126)]
    o += [pl("a",(566,142),(584,112),(598,80)), db(598,74), '<circle class="x" cx="568" cy="176" r="14"/>']
    return "".join(o)+labels("Certo","Evite",190,580)
F["waiter-walk"] = ("Caminhada do garçom: braço estendido com o halter acima da cabeça e tronco neutro (certo) ou lombar arqueada (evite)", cr_waiter())
