import sys; sys.path.insert(0,'/home/claude/repo/scripts')
from figlib import *
import math
F = {}

def jk_ik(h, a, l1=40, l2=40):
    """Joelho dado quadril h e tornozelo a (pessoa virada para a direita; joelho para a frente/cima)."""
    dx, dy = a[0]-h[0], a[1]-h[1]; d = math.hypot(dx, dy)
    d = min(d, l1+l2-0.5); ux, uy = dx/math.hypot(dx, dy), dy/math.hypot(dx, dy)
    x = (l1*l1 - l2*l2 + d*d)/(2*d); hh = math.sqrt(max(l1*l1 - x*x, 0))
    return (round(h[0]+ux*x + uy*hh, 1), round(h[1]+uy*x - ux*hh, 1))

def jk_leg(c, h, a, toe=None, heel=None):
    k = jk_ik(h, a)
    o = [pl(c, h, k, a)]
    if toe: o.append(pl(c, a, toe))
    return o, k

def jk_foot(a, dx=14, dy=2): return (a[0]+dx, a[1]+dy)
def jk_circle(x, y, r): return f'<circle class="e" cx="{x}" cy="{y}" r="{r}"/>'
def jk_dash_arrow(x1, y1, x2, y2): return f'<path class="e" d="M{x1} {y1}L{x2} {y2}" marker-end="url(#arr)"/>'

# ---------- deitado de bruços ----------
def jk_prone(dx, ankle_rel, bench_end=236, extra="", pad_ankle=True, halter=False):
    """Deitado de bruços (cabeça à esquerda). ankle_rel: tornozelo relativo a dx."""
    hip=(dx+190, 212); knee=(dx+230, 212); sh=(dx+140, 212)
    ank=(dx+ankle_rel[0], ankle_rel[1])
    o=[rect(dx+100,220,bench_end-100,8), line(dx+116,228,dx+116,270), line(dx+bench_end-14,228,dx+bench_end-14,270)]
    o += [pl("i", sh, hip), head(dx+126, 208), pl("i", sh, (dx+152,224)), pl("a", hip, knee), pl("a", knee, ank)]
    o.append(pl("a", ank, (ank[0]+12, ank[1]-2) if ank[1] > 200 else (ank[0]+2, ank[1]-12)) if False else "")
    return o, hip, knee, ank

def jk_flexora_deitada():
    o=[ground(80,330), ground(460,710)]
    for dx, ank in ((0,(270,212)), (390,(230,172))):
        b, hip, knee, a = jk_prone(dx, ank)
        o += b
        # rolo atras do tornozelo + alavanca
        o += [rect(a[0]-5, a[1]-14, 10, 16, "w", 4), line(a[0], a[1]-14, dx+236, 236) if False else line(a[0]+0, a[1]+4, dx+246, 240)]
        o += [rect(dx+236, 236, 24, 34), line(dx+216, 270, dx+270, 270)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["flexora-deitada"] = ("Mesa flexora: perna estendida com o rolo no tornozelo; joelho dobrado a 90 graus", jk_flexora_deitada())

def jk_flexora_halter():
    o=[ground(80,330), ground(460,710)]
    for dx, ank, vert in ((0,(270,212),True), (390,(230,174),False)):
        b, hip, knee, a = jk_prone(dx, ank)
        o += b
        o.append(pl("a", a, (a[0]+10, a[1]) if vert else (a[0], a[1]-10)))
        o.append(db(a[0]+14, a[1], True) if vert else db(a[0], a[1]-18))
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["flexora-halter-deitado"] = ("Flexora com halter preso entre os pés, deitado de bruços: perna estendida e joelho dobrado a 90 graus", jk_flexora_halter())

def jk_flexora_em_pe_maquina():
    o=[ground(80,330), ground(460,710)]
    for dx, ank in ((0,(198,268)), (390,(160,244))):
        hip=(dx+190,188); S=(dx+206,142)
        sup_k=(dx+176,228); sup_a=(dx+170,268)
        o += [pl("i", hip, sup_k, sup_a), pl("i", sup_a, (dx+184,270))]
        kn=(dx+198,228)
        a=(dx+ank[0], ank[1])
        o += [pl("a", hip, kn, a), pl("i", hip, S), head(dx+212,126)]
        o += [pl("i", S, (dx+224,154), (dx+240,160))]
        # maquina: coluna, apoio da coxa e rolo
        o += [line(dx+244,160,dx+244,270), line(dx+236,160,dx+250,160), rect(dx+208,196,10,30,"e"), rect(a[0]-6, a[1]-5, 10, 18, "w", 4)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["flexora-em-pe-maquina"] = ("Flexora em pé unilateral: perna reta com rolo atrás do tornozelo e joelho dobrado levando o calcanhar ao glúteo", jk_flexora_em_pe_maquina())

def jk_flexora_cabo():
    o=[ground(80,330), ground(460,710)]
    for dx, ank in ((0,(180,268)), (390,(153,232))):
        hip=(dx+190,188); S=(dx+204,142)
        o += [pl("i", hip, (dx+196,228), (dx+204,268)), pl("i", (dx+204,268), (dx+218,270))]
        kn=(dx+188,228); a=(dx+ank[0], ank[1])
        o += [pl("a", hip, kn, a), pl("i", hip, S), head(dx+210,126)]
        o += [pl("i", S, (dx+232,158), (dx+258,160))]
        o += [line(dx+270,150,dx+270,270), line(dx+256,160,dx+270,160), jk_circle(dx+270,262,6)]
        o += [rect(a[0]-4,a[1]-3,8,8,"w",2), line(a[0]+2,a[1]+2,dx+264,262)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["flexora-cabo-em-pe"] = ("Flexão de joelho no cabo em pé: tornozeleira na polia baixa, joelho dobrado levando o calcanhar ao glúteo", jk_flexora_cabo())

# ---------- ponte com os calcanhares (bola / deslizador) ----------
def jk_ponte(kind):
    o=[ground(80,330), ground(460,710)]
    cfg = {"bola": ((142,236),(220,232),(176,230)), "desliza": ((142,236),(214,266),(176,266))}[kind]
    hip, a_ext, a_flex = cfg
    for dx, a in ((0, a_flex if kind=="desliza" else a_ext), (390, a_ext if kind=="desliza" else a_flex)):
        h=(hip[0]+dx, hip[1]); an=(a[0]+dx, a[1]); sh=(98+dx,264)
        k=jk_ik(h, an)
        o += [pl("i", sh, h), head(84+dx,262), pl("i", sh, (dx+150,266)), pl("a", h, k, an)]
        if kind=="bola": o.append(jk_circle(an[0], an[1]+20, 20))
        else:
            o += [rect(an[0]-14, an[1]+3, 28, 5, "w", 2)]
    if kind=="bola": o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["flexora-com-bola"] = ("Flexão de joelho na bola suíça: calcanhares na bola com pernas estendidas e quadril alto; bola puxada para perto do glúteo", jk_ponte("bola").replace(">Início<",">Estendida<",1) if False else jk_ponte("bola"))

def jk_deslizante():
    o=[ground(80,330), ground(460,710)]
    hip=(142,236); sh=(98,264)
    for dx, a in ((0,(176,266)), (390,(214,266))):
        h=(hip[0]+dx,hip[1]); an=(a[0]+dx,a[1]); s=(sh[0]+dx,sh[1]); k=jk_ik(h,an)
        o += [pl("i", s, h), head(84+dx,262), pl("i", s, (dx+150,266)), pl("a", h, k, an), rect(an[0]-14, an[1]+3, 28, 5, "w", 2)]
    o.append(labels("Início", "Fim", 200, 590))
    o.append(jk_dash_arrow(400,292,440,292).replace('class="e"','class="e"') if False else "")
    return "".join(o)
F["flexora-deslizante"] = ("Flexão de joelho com deslizador: calcanhares sobre o disco com joelhos dobrados; pernas estendidas deslizando e quadril alto", jk_deslizante())

def jk_nordic():
    o=[ground(80,330), ground(460,710)]
    for dx in (0, 390):
        o += [rect(dx+176,262,52,8,"e"), rect(dx+142,254,24,8,"w",3), line(dx+154,262,dx+154,270)]
        kn=(dx+200,260); a=(dx+158,260)
        o += [pl("i", kn, a)]
    # inicio: tronco ereto
    hip=(200,220); S=(200,172)
    o += [pl("a", (200,260), hip), pl("i", hip, S), pl("i", S, (214,192),(224,176)), head(201,156)]
    # fim: tronco caindo, maos amortecem
    hip=(626,243); S=(669,223)
    o += [pl("a", (590,260), hip), pl("i", hip, S), pl("i", S, (684,250), (692,266)), head(681,217)]
    o.append(jk_dash_arrow(250,160,300,196) if False else "")
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["nordic"] = ("Flexão nórdica: ajoelhado com tornozelos presos e tronco ereto; tronco desce reto à frente até as mãos tocarem o chão", jk_nordic())

# ---------- panturrilha em pé ----------
def jk_calf_stand(dx, raised, c="a", bent=False, extras=None, step_x=186, step_h=22, halter=False, support=False, other_leg=False):
    top = 270 - step_h
    if raised: a=(dx+182, top-20); heel=(dx+174, top-10); toe=(dx+198, top)
    else:      a=(dx+182, top-10); heel=(dx+176, top+6);  toe=(dx+198, top)
    o=[rect(dx+step_x, top, 78, step_h), ]
    if bent:
        k=(a[0]+10, a[1]-39); hip=(a[0]-3, a[1]-39-37)
    else:
        k=(a[0]+1, a[1]-40); hip=(a[0], a[1]-80)
    S=(hip[0]+1, hip[1]-48)
    o += [pl(c, heel, a, k, hip), pl(c, heel, toe), pl("i", hip, S), head(S[0]+1, S[1]-16)]
    if other_leg:
        o.append(pl("i", hip, (hip[0]-4, hip[1]+34), (hip[0]-40, hip[1]+42)))
    return o, a, k, hip, S

def jk_panturrilha_unilateral_halter():
    o=[ground(80,330), ground(460,710)]
    for dx, r in ((0,False),(390,True)):
        b, a, k, hip, S = jk_calf_stand(dx, r, other_leg=True, step_x=190)
        # corrigir degrau mais estreito
        o += b
        o += [pl("i", S, (S[0]-2,S[1]+26), (S[0]-3,S[1]+50)), db(S[0]-3, S[1]+58, True)]
        o += [pl("i", S, (S[0]+26,S[1]+12), (S[0]+56,S[1]+18)), line(dx+256,90,dx+256,270)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["panturrilha-unilateral-halter"] = ("Panturrilha unilateral com halter no degrau: calcanhar abaixo do degrau e depois na ponta do pé, com a outra mão apoiada", jk_panturrilha_unilateral_halter())

def jk_panturrilha_joelho_flexionado():
    o=[ground(80,330), ground(460,710)]
    for dx, r in ((0,False),(390,True)):
        b, a, k, hip, S = jk_calf_stand(dx, r, bent=True, other_leg=True, step_x=190)
        o += b
        o += [pl("i", S, (S[0]-2,S[1]+26), (S[0]-3,S[1]+50)), db(S[0]-3, S[1]+58, True)]
        o += [pl("i", S, (S[0]+26,S[1]+12), (S[0]+56,S[1]+18)), line(dx+256,90,dx+256,270)]
        o.append(jk_dash_arrow(dx+270,170,dx+270,170) if False else "")
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["panturrilha-joelho-flexionado"] = ("Panturrilha em pé com joelho flexionado: joelho dobrado e mantido, calcanhar baixo e depois na ponta do pé", jk_panturrilha_joelho_flexionado())

def jk_panturrilha_excentrica():
    o=[ground(80,330), ground(460,710)]
    top=248
    # inicio: duas pernas na ponta dos pes
    dx=0
    a=(182,228); k=(183,188); hip=(182,148); S=(183,100)
    o += [rect(186,top,90,22), pl("a", (174,236), a, k, hip), pl("a",(174,236),(198,top)), pl("i", hip, S), head(184,84)]
    o += [pl("i", S, (S[0]+26,S[1]+14), (S[0]+30,S[1]+42)), jk_dash_arrow(250,160,250,120) if False else ""]
    o.append('<path class="e" d="M240 130V90" marker-end="url(#arr)"/>')
    # fim: uma perna, calcanhar abaixo do degrau
    dx=390
    a=(dx+182,248); k=(dx+183,208); hip=(dx+182,168); S=(dx+183,120)
    o += [rect(dx+186,top,90,22), pl("a", (dx+174,260), a, k, hip), pl("a",(dx+174,260),(dx+198,top)), pl("i", hip, S), head(dx+184,104)]
    o += [pl("i", hip, (dx+190,204), (dx+164,228)), pl("i", S, (S[0]+26,S[1]+14), (S[0]+30,S[1]+42))]
    o.append(f'<path class="e" d="M{dx+240} 110V150" marker-end="url(#arr)"/>')
    o.append(labels("Sobe com as duas", "Desce com uma", 200, 590))
    return "".join(o)
F["panturrilha-excentrica"] = ("Panturrilha excêntrica unilateral: sobe na ponta dos pés com as duas pernas; desce devagar com uma só até o calcanhar passar do degrau", jk_panturrilha_excentrica())

def jk_smith_frame(dx, bar_y, bar_x0=140, bar_w=100):
    return [line(dx+bar_x0+bar_w+40, 70, dx+bar_x0+bar_w+40, 270), rect(dx+bar_x0, bar_y-4, bar_w, 8, "w"), line(dx+bar_x0+bar_w, bar_y, dx+bar_x0+bar_w+40, bar_y)]

def jk_panturrilha_smith():
    o=[ground(80,330), ground(460,710)]
    for dx, r in ((0,False),(390,True)):
        b, a, k, hip, S = jk_calf_stand(dx, r, step_x=190)
        o += b
        o += jk_smith_frame(dx, S[1]-2)
        o += [pl("i", S, (S[0]+16,S[1]+16), (S[0]+22,S[1]-2))]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["panturrilha-smith"] = ("Panturrilha em pé no smith: barra nos ombros, ponta dos pés no degrau; calcanhar baixo e depois elevado", jk_panturrilha_smith())

# ---------- panturrilha sentado ----------
def jk_seated(dx, raised, bar=False, db_on=True):
    top=252
    if raised:
        a=(dx+190,228); k=(dx+188,188); heel=(dx+184,240)
    else:
        a=(dx+190,242); k=(dx+190,202); heel=(dx+184,254)
    toe=(dx+206,top)
    hip=(dx+150,204); S=(dx+150,156)
    o=[rect(dx+192,top,70,18), rect(dx+108,212,78,8), line(dx+122,220,dx+122,270), line(dx+172,220,dx+172,270)]
    o += [pl("a", heel, a, k), pl("a", heel, toe), pl("i", k, hip), pl("i", hip, S), head(dx+150,140)]
    if bar:
        o += [rect(dx+166,k[1]-12,36,10,"w",3), pl("i", S, (dx+166,S[1]+22), (dx+176,k[1]-14))]
    else:
        o += [pl("i", S, (dx+170,S[1]+22), (k[0]-2, k[1]-12)), db(k[0], k[1]-14)]
    return o

def jk_sentado_halter():
    o=[ground(80,330), ground(460,710)]
    o += jk_seated(0, False) + jk_seated(390, True)
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["panturrilha-sentado-halter"] = ("Panturrilha sentado com halter: halteres sobre os joelhos, ponta dos pés na anilha; calcanhar baixo e depois elevado", jk_sentado_halter())

def jk_sentado_smith():
    o=[ground(80,330), ground(460,710)]
    for dx, r in ((0,False),(390,True)):
        o += jk_seated(dx, r, bar=True)
        o += [line(dx+300,70,dx+300,270), line(dx+202,k_y(r)-7,dx+300,k_y(r)-7), line(dx+110,k_y(r)-7,dx+166,k_y(r)-7)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
def k_y(r): return 188 if r else 202
F["panturrilha-sentado-smith"] = ("Panturrilha sentado no smith: barra com almofada sobre as coxas, ponta dos pés no degrau; calcanhar baixo e depois elevado", jk_sentado_smith())

# ---------- leg press ----------
S2 = 0.7071
def jk_lp_machine(hip, S, plate_pt, post=True):
    o=[line(hip[0]-44,hip[1]+8,hip[0]+30,hip[1]+8), line(hip[0]-16,hip[1]+8,hip[0]-16,270), line(hip[0]+18,hip[1]+8,hip[0]+18,270)]
    o.append(line(S[0]-14, S[1]-6, hip[0]-10, hip[1]+4))
    return o

def jk_leg_press(dx, a, foot_v, plate_shift=0, calf=False, leg_c="a", other=False):
    hip=(150+dx,228); S=(118+dx,192)
    ank=(a[0]+dx, a[1])
    k=jk_ik(hip, ank)
    toe=(ank[0]+foot_v[0], ank[1]+foot_v[1])
    pc=(toe[0]+3.5, toe[1]-3.5)
    P1=(pc[0]-40*S2, pc[1]-40*S2); P2=(pc[0]+(8 if calf else 18)*S2, pc[1]+(8 if calf else 18)*S2)
    o=jk_lp_machine(hip,S,pc)
    o += [pl("i", hip, S), head(S[0]-10, S[1]-14), pl("i", S, (dx+136,206), (dx+154,216))]
    o += [pl(leg_c, hip, k, ank), pl(leg_c, ank, toe)]
    o += [line(P1[0],P1[1],P2[0],P2[1],"e"), rect(P1[0]-3,P1[1]-3,6,6,"e",1) if False else "", line(P2[0],P2[1],P2[0],270)]
    return o, k, hip

def jk_calf_leg_press(explosive=False):
    o=[ground(80,330), ground(460,710)]
    v0=(-15.6,-15.6); v1=(-4,-21.7)
    for dx, a, v in ((0,(198,176),v0), (390,(204,170),v1)):
        b,_,_ = jk_leg_press(dx, a, v, calf=not explosive)
        o += b
    if explosive:
        o.append('<path class="e" d="M626 250l24 -24" marker-end="url(#arr)"/>') if False else None
        o.append(labels("Apoio", "Impulso", 200, 590).replace(ARROW, ARROW))
    else:
        o.append(labels("Início", "Fim", 200, 590))
    return "".join(x for x in o if x)
F["panturrilha-leg-press"] = ("Panturrilha no leg press: ponta dos pés na borda baixa da plataforma, joelhos estendidos; tornozelo flexionado e depois empurrando na ponta dos pés", jk_calf_leg_press())
F["panturrilha-explosiva-leg-press"] = ("Panturrilha explosiva no leg press: joelhos quase retos, pés na plataforma; empurra rápido com a ponta dos pés", jk_calf_leg_press(True).replace('>Apoio<','>Apoio<'))

def jk_leg_press_unilateral():
    o=[ground(80,330), ground(460,710)]
    v0=(-15.6,-15.6)
    for dx, a in ((0,(198,176)), (390,(185,193))):
        b,k,hip = jk_leg_press(dx, a, v0)
        o += b
        # outra perna fora da plataforma, pe apoiado na lateral
        o += [pl("i", hip, (hip[0]+34,hip[1]-6), (hip[0]+30,hip[1]+32)), rect(hip[0]+16, hip[1]+32, 30, 6, "e", 2)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["leg-press-unilateral"] = ("Leg press unilateral: uma perna na plataforma, a outra apoiada fora; perna estendida e joelho flexionado perto do tronco", jk_leg_press_unilateral())

# ---------- afundos ----------
def jk_arms_db(S):
    return [pl("i", S, (S[0]+1,S[1]+26), (S[0]+2,S[1]+50)), db(S[0]+2, S[1]+58, True)]

def jk_lunge(dx, hip, front, rear, rear_foot=None, c="a", swing=False, S=None):
    kf=jk_ik(hip, front); kr=jk_ik(hip, rear)
    S = S or (hip[0]-2, hip[1]-48)
    o=[pl(c, hip, kf, front), pl("i", front, (front[0]+14, front[1]+2)) if False else pl(c, front, (front[0]+14,front[1]+2))]
    o += [pl(c, hip, kr, rear), pl(c, rear, (rear[0]+(14 if False else -2), 270))] if False else []
    o += [pl(c, hip, kr, rear), pl(c, rear, (rear[0]+8, rear[1]+10))]
    o += [pl("i", hip, S), head(S[0]+1, S[1]-16)] + jk_arms_db(S)
    return o

def jk_afundo_estatico():
    o=[ground(80,330), ground(460,710)]
    o += jk_lunge(0, (206,200), (230,268), (150,258))
    o += jk_lunge(390, (590,226), (620,268), (530,262))
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["afundo-estatico"] = ("Afundo estático: pés afastados em passo largo, halteres ao lado; desce reto até o joelho de trás perto do chão", jk_afundo_estatico())

def jk_afundo_reverso():
    o=[ground(80,330), ground(460,710)]
    o += jk_lunge(0, (222,190), (230,268), (210,268))
    o += jk_lunge(390, (590,226), (620,268), (530,262))
    o.append(jk_dash_arrow(620,284,545,284))
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["afundo-reverso"] = ("Afundo reverso: em pé com os pés juntos; passo para trás e descida do joelho de trás até perto do chão, peso no pé da frente", jk_afundo_reverso())

def jk_afundo_andando():
    o=[ground(80,330), ground(460,710)]
    o += jk_lunge(0, (190,226), (220,268), (140,262))
    # fim: passando a perna de tras para frente
    hip=(590,190); a=(594,268); k=(592,229)
    S=(588,142)
    o += [pl("a", hip, k, a), pl("a", a, (a[0]+14,a[1]+2))]
    sw=(606,240); ks=jk_ik(hip, sw)
    o += [pl("a", hip, ks, sw), pl("i", hip, S), head(589,126)] + jk_arms_db(S)
    o.append(jk_dash_arrow(540,284,650,284))
    o.append(labels("Desce", "Passa à frente", 200, 590))
    return "".join(o)
F["afundo-andando"] = ("Afundo andando: desce com joelho de trás perto do chão; depois levanta e leva a perna de trás à frente para o passo seguinte", jk_afundo_andando())

# ---------- bulgaro smith ----------
def jk_bulgaro_smith():
    o=[ground(80,330), ground(460,710)]
    F_=(240,268); R=(146,216)
    for dx, hip in ((0,(206,196)), (390,(200,226))):
        f=(F_[0]+dx,F_[1]); r=(R[0]+dx,R[1]); h=(hip[0]+dx,hip[1])
        S=(h[0]-2,h[1]-48)
        o += [rect(dx+100,222,70,48), pl("a", h, jk_ik(h,f), f), pl("a", f, (f[0]+14,f[1]+2)), pl("a", h, jk_ik(h,r), r), pl("a", r, (r[0]-22,r[1]+6))]
        o += [pl("i", h, S), head(S[0]+1,S[1]-16), rect(S[0]-52, S[1]-8, 100, 8, "w"), line(S[0]+48,S[1]-4,dx+300,S[1]-4), line(dx+300,70,dx+300,270)]
        o += [pl("i", S, (S[0]-14,S[1]+14), (S[0]-4,S[1]-2))] if False else []
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["agachamento-bulgaro-smith"] = ("Agachamento búlgaro no smith: pé de trás no banco, barra nos ombros; descida vertical até a coxa da frente ficar paralela", jk_bulgaro_smith())

# ---------- pistol ----------
def jk_pistol():
    o=[ground(80,330), ground(460,710)]
    # inicio
    hip=(190,188); a=(190,268); k=(192,228); S=(190,140)
    o += [pl("a", hip, k, a), pl("a", a, (204,270)), pl("i", hip, (230,192), (268,200)), pl("i", hip, S), head(191,124), pl("i", S, (220,146), (250,146))]
    # fim
    hip=(560,246); a=(590,268); k=jk_ik(hip,a); S=(582,202)
    o += [rect(496,248,50,22), pl("a", hip, k, a), pl("a", a, (604,270)), pl("i", hip, (600,242), (638,238)), pl("i", hip, S), head(590,188), pl("i", S, (612,206), (642,204))]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["agachamento-pistol"] = ("Agachamento pistol: em pé numa perna com a outra estendida à frente; desce agachando numa perna só até o banco atrás", jk_pistol())

# ---------- step-up lateral (de frente) ----------
def jk_stepup_lateral():
    o=[ground(80,330), ground(460,710)]
    # inicio
    o += [rect(228,238,80,32)]
    sh=(190,138)
    o += [pl("i",(180,192),(178,230),(176,268)), pl("a",(200,192),(214,214),(238,232)), pl("i",(180,192),(200,192)), pl("i",(190,192),sh), pl("i",(sh[0]-18,sh[1]),(sh[0]+18,sh[1])), head(190,116)]
    o += [pl("i",(sh[0]-18,sh[1]),(sh[0]-24,sh[1]+30),(sh[0]-24,sh[1]+54)), db(sh[0]-24,sh[1]+60,True), pl("i",(sh[0]+18,sh[1]),(sh[0]+22,sh[1]+30),(sh[0]+22,sh[1]+54)), db(sh[0]+22,sh[1]+60,True)]
    # fim
    dx=390
    o += [rect(dx+228,238,80,32)]
    sh=(dx+244,92)
    o += [pl("a",(dx+252,160),(dx+250,200),(dx+250,236)), pl("i",(dx+234,160),(dx+226,194),(dx+222,214)), pl("i",(dx+234,160),(dx+252,160)), pl("i",(dx+243,160),sh), pl("i",(sh[0]-18,sh[1]),(sh[0]+18,sh[1])), head(sh[0],70)]
    o += [pl("i",(sh[0]-18,sh[1]),(sh[0]-24,sh[1]+30),(sh[0]-24,sh[1]+54)), db(sh[0]-24,sh[1]+60,True), pl("i",(sh[0]+18,sh[1]),(sh[0]+22,sh[1]+30),(sh[0]+22,sh[1]+54)), db(sh[0]+22,sh[1]+60,True)]
    o.append(labels("Início", "Fim", 200, 590))
    return "".join(o)
F["step-up-lateral"] = ("Step-up lateral visto de frente: perna de dentro sobre o step, halteres ao lado; sobe até ficar em pé no step com a outra perna no ar", jk_stepup_lateral())
