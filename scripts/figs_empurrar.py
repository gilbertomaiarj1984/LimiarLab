import sys; sys.path.insert(0,'/home/claude/repo/scripts')
from figlib import *
F = {}

# ---------- auxiliares (prefixo emp_) ----------
def emp_band(*pts): return '<polyline class="e" style="stroke:#7a8a84;stroke-width:3.2;fill:none" points="' + " ".join(f"{x},{y}" for x, y in pts) + '"/>'
def emp_plate(x, y, r=13): return f'<circle class="w" cx="{x}" cy="{y}" r="{r}"/>'
def emp_pulley(x, y): return f'<circle class="e" cx="{x}" cy="{y}" r="6"/>'
def emp_ef(dx, L, R, cl="a", cr="a", lean=0, sh_y=136, hip_y=190):
    """De frente: pessoa em pé; braços com cores independentes."""
    sh = (190 + dx + lean, sh_y)
    o = [pl("i", (180 + dx, hip_y), (178 + dx, 268)), pl("i", (200 + dx, hip_y), (202 + dx, 268)), pl("i", (180 + dx, hip_y), (200 + dx, hip_y)),
         pl("i", (190 + dx, hip_y), sh), pl("i", (sh[0] - 18, sh[1]), (sh[0] + 18, sh[1])), head(sh[0], sh[1] - 22)]
    if L: o.append(pl(cl, (sh[0] - 18, sh[1]), *L))
    if R: o.append(pl(cr, (sh[0] + 18, sh[1]), *R))
    return o
def emp_two(fn, a="Início", b="Fim", xa=190, xb=570):
    return "".join([ground(80, 330), ground(460, 710)] + fn(0) + fn(380) + [labels(a, b, xa, xb)])

# ---------- banco reto ----------
def emp_flat(dx):
    return [ground(80+dx, 330+dx), rect(110+dx, 206, 140, 8), line(130+dx, 214, 130+dx, 270), line(230+dx, 214, 230+dx, 270),
            pl("i", (196+dx, 200), (238+dx, 190), (244+dx, 262)), pl("i", (196+dx, 200), (146+dx, 200)), head(130+dx, 196)]
def emp_flat_pair(kind):
    o = []
    s = [(146, 200), (150, 222), (152, 188)]; e = [(146, 200), (149, 170), (152, 140)]
    for dx, arm, hy in ((0, s, 188), (380, e, 140)):
        o += emp_flat(dx)
        if kind == "barra":
            o += [line(104+dx, 150, 104+dx, 270), line(104+dx, 150, 118+dx, 150)]
            o.append(emp_plate(152+dx, hy))
        elif kind == "smith":
            o.append(line(152+dx, 72, 152+dx, 270)); o.append(db(152+dx, hy))
            o += [line(140+dx, 100, 164+dx, 100), line(140+dx, 230, 164+dx, 230)] if False else []
        o.append(pl("a", *[(x+dx, y) for x, y in arm]))
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["supino-reto-barra"] = ("Supino reto com barra no rack: barra no peito e braços estendidos", emp_flat_pair("barra"))
F["supino-smith"] = ("Supino reto no smith: barra guiada no trilho, no peito e com braços estendidos", emp_flat_pair("smith"))

# ---------- banco inclinado (supino) ----------
def emp_inc(dx):
    return [ground(80+dx, 330+dx), pl("e", (118+dx, 160), (182+dx, 220), (244+dx, 220)), line(182+dx, 220, 182+dx, 270),
            pl("i", (186+dx, 214), (226+dx, 212), (228+dx, 262)), pl("i", (186+dx, 214), (142+dx, 176)), head(132+dx, 162)]
def emp_inc_smith():
    o = []
    for dx, arm, hy in ((0, [(142,176),(146,204),(164,184)], 182), (380, [(142,176),(153,148),(164,120)], 118)):
        o += [line(164+dx, 72, 164+dx, 270)] + emp_inc(dx) + [pl("a", *[(x+dx, y) for x, y in arm]), db(164+dx, hy)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["supino-inclinado-smith"] = ("Supino inclinado no smith: barra no trilho, no peito e acima, com banco inclinado", emp_inc_smith())

def emp_inc_machine():
    o = []
    for dx, el, hd in ((0, (148,226), (180,214)), (380, (183,183), (204,162))):
        o += [ground(80+dx, 330+dx), pl("e", (190+dx,248),(144+dx,200),(136+dx,208),(184+dx,256)), rect(184+dx,242,56,8), line(212+dx,250,212+dx,270),
              pl("i", (196+dx,236),(234+dx,232),(240+dx,268)), pl("i", (196+dx,236),(162+dx,202)), head(153+dx,193),
              line(250+dx,206,250+dx,270), pl("e", (hd[0]+dx,hd[1]),(250+dx,206)), rect(hd[0]+dx-6,hd[1]-5,12,10,"e",2),
              pl("a", (162+dx,202),(el[0]+dx,el[1]),(hd[0]+dx,hd[1]))]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["supino-inclinado-maquina"] = ("Supino inclinado na máquina: sentado reclinado, empurrando as manoplas para frente e para cima", emp_inc_machine())

# ---------- supino no chão com halteres ----------
def emp_floor():
    o = []
    for dx, arm, hy, vert in ((0, [(146,258),(152,262),(160,232)], 228, True), (380, [(146,258),(148,226),(150,198)], 194, True)):
        o += [ground(80+dx, 330+dx), pl("i",(196+dx,258),(232+dx,236),(262+dx,262)), pl("i",(196+dx,258),(146+dx,258)), head(130+dx,256),
              pl("a", *[(x+dx,y) for x,y in arm]), db(arm[-1][0]+dx, hy)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["supino-chao-halteres"] = ("Supino no chão com halteres: cotovelos tocando o chão e braços estendidos", emp_floor())

# ---------- supino com elástico (em pé, banda nas costas) ----------
def emp_band_press():
    o = [ground(80,330), ground(460,710)]
    for dx, el, hd in ((0, (172,158), (208,144)), (380, (214,142), (248,144))):
        A,K,H,S,Hd = stand(dx)
        o += [pl("i",A,K,H), pl("i",H,S), head(*Hd), emp_band((hd[0]+dx,hd[1]),(S[0]-6,S[1]-4),(S[0]-6,S[1]+8)),
              pl("a",S,(el[0]+dx,el[1]),(hd[0]+dx,hd[1]))]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["supino-elastico"] = ("Supino com elástico em pé: elástico passado nas costas, mãos no peito e braços estendidos à frente", emp_band_press())

# ---------- crucifixo inclinado com halteres (visto dos pés) ----------
def emp_fly_inc():
    o = []
    for dx, L, R in ((0, [(138,190),(106,194)], [(242,190),(274,194)]), (380, [(172,146),(176,116)], [(208,146),(204,116)])):
        o += [ground(80+dx,330+dx), rect(172+dx,160,36,70,"e",6), line(190+dx,230,190+dx,270),
              pl("i",(172+dx,176),(208+dx,176)), pl("i",(190+dx,176),(190+dx,214)), head(190+dx,150),
              pl("i",(180+dx,214),(176+dx,236),(178+dx,268)), pl("i",(200+dx,214),(204+dx,236),(202+dx,268)),
              pl("a",(172+dx,176),*[(x+dx,y) for x,y in L]), pl("a",(208+dx,176),*[(x+dx,y) for x,y in R]),
              db(L[-1][0]+dx, L[-1][1]+ (6 if dx==0 else -4), True), db(R[-1][0]+dx, R[-1][1]+(6 if dx==0 else -4), True)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["crucifixo-inclinado-halteres"] = ("Crucifixo inclinado com halteres, visto dos pés do banco: braços abertos e depois halteres juntos acima do peito", emp_fly_inc())

# ---------- crucifixo na máquina (peck deck, visto de cima) ----------
def emp_peck():
    o = []
    for dx, L, R in ((0, [(100,200),(100,160)], [(280,200),(280,160)]), (380, [(150,170),(180,150)], [(230,170),(200,150)])):
        cx = 190+dx
        o += [rect(cx-34,222,68,12,"e",4), pl("i",(cx-30,206),(cx+30,206)), pl("i",(cx,206),(cx,222)), head(cx,200),
              pl("a",(cx-30,206),*[(x+dx,y+6) for x,y in L]), pl("a",(cx+30,206),*[(x+dx,y+6) for x,y in R])]
        for p in (L[-1], R[-1]): o.append(rect(p[0]+dx-5,p[1]+6-10,10,20,"e",3))
    o.append(labels("Início (visto de cima)", "Fim", 190, 570))
    return "".join(o)
F["crucifixo-maquina"] = ("Crucifixo na máquina visto de cima: braços abertos ao lado e depois mãos juntas à frente do peito", emp_peck())

# ---------- crossover na polia baixa (de frente) ----------
def emp_cross():
    o = [ground(80,330), ground(460,710)]
    for dx, L, R, hl, hr in ((0, [(150,168),(132,196)], [(230,168),(248,196)], (132,196), (248,196)),
                             (380, [(162,158),(186,130)], [(218,158),(194,130)], (186,130), (194,130))):
        o += [rect(82+dx,256,20,14,"e",3), rect(278+dx,256,20,14,"e",3), emp_pulley(92+dx,258), emp_pulley(288+dx,258),
              line(92+dx,258,hl[0]+dx,hl[1]), line(288+dx,258,hr[0]+dx,hr[1])]
        o += emp_ef(dx, [(x+dx,y) for x,y in L], [(x+dx,y) for x,y in R])
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
# o chão da quadro já cobre a base das polias
F["crossover-baixo-cabo"] = ("Crossover na polia baixa, de frente: braços abertos e baixos, depois mãos juntas à altura do peito", emp_cross())

# ---------- flexões (lado) ----------
def emp_pu(dx, foot, sh, el, hand, bench=False):
    ux, uy = sh[0]-foot[0], sh[1]-foot[1]
    hip = (foot[0]+ux*0.55, foot[1]+uy*0.55); kn = (foot[0]+ux*0.28, foot[1]+uy*0.28)
    n = (ux**2+uy**2)**.5
    hd = (sh[0]+ux/n*18, sh[1]+uy/n*18-4)
    o = [ground(80+dx,330+dx)]
    if bench: o.append(rect(80+dx,190,70,80))
    o += [pl("i",(foot[0]+dx,foot[1]),(kn[0]+dx,kn[1]),(hip[0]+dx,hip[1])), pl("a",(hip[0]+dx,hip[1]),(sh[0]+dx,sh[1])), head(hd[0]+dx,hd[1]),
          pl("a",(sh[0]+dx,sh[1]),(el[0]+dx,el[1]),(hand[0]+dx,hand[1]))]
    return o
def emp_pushup(bench):
    o = []
    if not bench:
        o += emp_pu(0,(120,264),(244,212),(246,242),(250,268)) + emp_pu(380,(120,264),(252,238),(232,254),(250,268))
    else:
        o += emp_pu(0,(112,184),(246,214),(248,242),(252,268),True) + emp_pu(380,(112,184),(256,240),(234,256),(252,268),True)
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["flexao-de-bracos"] = ("Flexão de braços: corpo em prancha, braços estendidos e depois peito perto do chão", emp_pushup(False))
F["flexao-pes-elevados"] = ("Flexão com pés elevados num banco: corpo inclinado para baixo, braços estendidos e depois peito perto do chão", emp_pushup(True))

# ---------- mergulho nas paralelas ----------
def emp_dip():
    o = []
    for dx, S, E, Hp, Kn, Ft, hd in ((0,(190,150),(196,180),(190,208),(184,238),(156,254),(190,132)) ,
                                      (380,(194,182),(172,198),(180,230),(176,260),(146,248),(200,166))):
        o += [ground(80+dx,330+dx), line(180+dx,210,290+dx,210), line(280+dx,210,280+dx,270), line(180+dx,210,180+dx,214),
              pl("i",(Ft[0]+dx,Ft[1]),(Kn[0]+dx,Kn[1]),(Hp[0]+dx,Hp[1])), pl("i",(Hp[0]+dx,Hp[1]),(S[0]+dx,S[1])), head(hd[0]+dx,hd[1]),
              pl("a",(S[0]+dx,S[1]),(E[0]+dx,E[1]),(190+dx,208))]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["mergulho-paralelas"] = ("Mergulho nas paralelas: braços estendidos sustentando o corpo e depois cotovelos dobrados", emp_dip())

# ---------- desenvolvimentos ----------
def emp_seat(dx):
    return [ground(80+dx,330+dx), rect(160+dx,210,52,8), line(186+dx,218,186+dx,270), line(160+dx,212,154+dx,124),
            pl("i",(178+dx,206),(220+dx,206),(222+dx,262)), pl("i",(178+dx,206),(176+dx,158)), head(176+dx,142)]
def emp_arnold():
    o = []
    for dx, arm, h in ((0, [(176,158),(200,178),(194,146)], (194,142)), (380, [(176,158),(180,128),(182,100)], (182,96))):
        o += emp_seat(dx) + [pl("a",*[(x+dx,y) for x,y in arm]), db(h[0]+dx,h[1])]
    o.append(labels("Início (palmas p/ você)","Fim (palmas p/ frente)",190,570)); return "".join(o)
F["arnold-press"] = ("Arnold press sentado: halteres à frente do rosto com palmas viradas para você, girando as palmas para frente ao empurrar acima da cabeça", emp_arnold())

def emp_behind():
    o = []
    for dx, arm, h in ((0, [(190,140),(180,164),(176,136)], (176,134)), (380, [(190,140),(184,110),(178,82)], (178,78))):
        A,K,H,S,Hd = stand(dx)
        o += [ground(80+dx,330+dx), emp_plate(h[0]+dx,h[1],11), pl("i",A,K,H), pl("i",H,S), head(*Hd), pl("a",(S[0],S[1]),*[(x+dx,y) for x,y in arm[1:]])]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["desenvolvimento-atras-nuca"] = ("Desenvolvimento atrás da nuca em pé: barra apoiada atrás da cabeça e empurrada para cima", emp_behind())

def emp_ohp():
    o = []
    for dx, arm, h in ((0, [(190,140),(204,164),(206,136)], (208,134)), (380, [(190,140),(196,110),(198,82)], (198,78))):
        A,K,H,S,Hd = stand(dx)
        o += [ground(80+dx,330+dx), emp_plate(h[0]+dx,h[1],11), pl("i",A,K,H), pl("i",H,S), head(*Hd), pl("a",S,*[(x+dx,y) for x,y in arm[1:]])]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["desenvolvimento-barra-em-pe"] = ("Desenvolvimento com barra em pé: barra na altura dos ombros e empurrada acima da cabeça", emp_ohp())

def emp_ohp_band():
    o = []
    for dx, arm, h in ((0, [(190,140),(204,164),(206,136)], (206,136)), (380, [(190,140),(196,110),(198,82)], (198,82))):
        A,K,H,S,Hd = stand(dx)
        o += [ground(80+dx,330+dx), emp_band((190+dx,268),(h[0]+dx,h[1])), pl("i",A,K,H), pl("i",H,S), head(*Hd), pl("a",S,*[(x+dx,y) for x,y in arm[1:]])]
        o.append(line(176+dx,270,204+dx,270,"e"))
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["desenvolvimento-elastico"] = ("Desenvolvimento com elástico em pé: elástico preso sob os pés, mãos nos ombros e braços estendidos acima da cabeça", emp_ohp_band())

def emp_dev_machine():
    o = []
    for dx, arm, h in ((0, [(176,158),(198,174),(200,146)], (200,146)), (380, [(176,158),(190,128),(194,100)], (194,100))):
        o += emp_seat(dx) + [line(136+dx,90,136+dx,270), pl("e",(h[0]+dx,h[1]),(136+dx,100)), rect(h[0]+dx-6,h[1]-5,12,10,"e",2),
                             pl("a",*[(x+dx,y) for x,y in arm])]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["desenvolvimento-maquina"] = ("Desenvolvimento na máquina sentado: manoplas na altura dos ombros e empurradas para cima", emp_dev_machine())

def emp_dev_smith():
    o = []
    for dx, arm, h in ((0, [(176,158),(198,174),(196,146)], 146), (380, [(176,158),(190,128),(196,98)], 96)):
        o += [line(196+dx,72,196+dx,270)] + emp_seat(dx) + [pl("a",*[(x+dx,y) for x,y in arm]), db(196+dx,h)]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["desenvolvimento-smith"] = ("Desenvolvimento no smith sentado: barra guiada no trilho, dos ombros até acima da cabeça", emp_dev_smith())

# ---------- flexão pike ----------
def emp_pike():
    o = []
    for dx, hip, S, hd, el in ((0,(176,198),(222,214),(236,226),(231,241)), (380,(184,208),(222,240),(236,254),(206,260))):
        mid = (((128+hip[0])/2),((266+hip[1])/2))
        o += [ground(80+dx,330+dx), pl("i",(128+dx,266),(mid[0]+dx,mid[1]),(hip[0]+dx,hip[1])), pl("a",(hip[0]+dx,hip[1]),(S[0]+dx,S[1])),
              head(hd[0]+dx,hd[1]), pl("a",(S[0]+dx,S[1]),(el[0]+dx,el[1]),(240+dx,268))]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["flexao-pike"] = ("Flexão pike: quadril alto em V invertido com braços estendidos e depois cabeça descendo entre as mãos", emp_pike())

# ---------- elevações laterais ----------
def emp_lat_cable():
    o = []
    for dx, R, hand in ((0, [(212,166),(214,194)], (214,194)), (380, [(238,138),(266,138)], (266,138))):
        o += [ground(80+dx,330+dx), rect(82+dx,256,20,14,"e",3), emp_pulley(92+dx,258), line(92+dx,258,hand[0]+dx,hand[1])]
        o += emp_ef(dx, [(172+dx,166),(170+dx,194)], [(x+dx,y) for x,y in R], "i", "a")
        o.append(db(hand[0]+dx,hand[1]+4,True))
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["elevacao-lateral-cabo"] = ("Elevação lateral unilateral no cabo, de frente: polia baixa ao lado, braço sobe do quadril até a altura do ombro", emp_lat_cable())

def emp_lat_band():
    o = []
    for dx, L, R in ((0, [(168,166),(166,194)], [(212,166),(214,194)]), (380, [(522-380,138),(494-380,138)], [(618-380,136),(646-380,138)])):
        Lp = [(x+dx,y) for x,y in L]; Rp = [(x+dx,y) for x,y in R]
        o += [ground(80+dx,330+dx), emp_band((188+dx,268),Lp[-1]), emp_band((192+dx,268),Rp[-1]), line(176+dx,270,204+dx,270)]
        o += emp_ef(dx, Lp, Rp)
        o += [db(Lp[-1][0],Lp[-1][1]+2,True) if False else "", ]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["elevacao-lateral-elastico"] = ("Elevação lateral com elástico, de frente: elástico sob os pés, braços sobem dos lados até a altura dos ombros", emp_lat_band())

def emp_lat_lying():
    o = []
    S = (148,176)
    for dx, arm in ((0, [(S[0]+24,S[1]+14),(S[0]+48,S[1]+30)]), (380, [(S[0]+2,S[1]-28),(S[0]+4,S[1]-58)])):
        o += [ground(80+dx,330+dx), pl("e",(100+dx,162),(184+dx,222),(262+dx,222)), line(184+dx,222,184+dx,270), line(262+dx,222,262+dx,270),
              pl("i",(S[0]+dx,S[1]),(S[0]+36+dx,S[1]+30)), pl("i",(S[0]+36+dx,S[1]+30),(216+dx,214),(250+dx,212)), head(S[0]-12+dx,S[1]-10),
              pl("a",(S[0]+dx,S[1]),*[(x+dx,y) for x,y in arm]), db(arm[-1][0]+dx,arm[-1][1]+(6 if dx==0 else -6),True)]
    o.append('<path class="d" d="M214 168Q244 150 238 126"/>') if False else None
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["elevacao-lateral-inclinada-halter"] = ("Elevação lateral deitado de lado no banco inclinado, visto de frente: braço de cima ao longo do corpo e depois na vertical", emp_lat_lying())

def emp_mx(p, cx): return (2*cx-p[0], p[1])
def emp_lat_machine():
    o = []
    for dx, el in ((0,(166,204)), (380,(138,172))):
        cx = 190+dx; L = (el[0]+dx, el[1]); R = emp_mx(L, cx)
        sh = (cx-18,172); sr = (cx+18,172)
        o += [ground(80+dx,330+dx), rect(cx-40,226,80,8), rect(cx-24,150,48,76,"e",6),
              pl("i",(cx-10,234),(cx-12,268)), pl("i",(cx+10,234),(cx+12,268)),
              pl("i",(cx-10,222),(cx+10,222)), pl("i",(cx,222),(cx,172)), pl("i",sh,sr), head(cx,150),
              pl("a",sh,L), pl("a",sr,R), emp_pulley(cx-80,196), emp_pulley(cx+80,196),
              line(cx-80,196,L[0],L[1],"e"), line(cx+80,196,R[0],R[1],"e"), rect(L[0]-6,L[1]-8,12,16,"e",3), rect(R[0]-6,R[1]-8,12,16,"e",3)]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["elevacao-lateral-maquina"] = ("Elevação lateral na máquina sentado, de frente: cotovelos apoiados nas almofadas descem junto ao corpo e sobem até a altura dos ombros", emp_lat_machine())

# ---------- remada alta ----------
def emp_upright():
    o = []
    for dx, arm, h in ((0, [(190,140),(190,168),(192,196)], (192,196)), (380, [(190,140),(218,128),(206,152)], (206,152))):
        A,K,H,S,Hd = stand(dx)
        o += [ground(80+dx,330+dx), pl("i",A,K,H), pl("i",H,S), head(*Hd), emp_plate(h[0]+dx,h[1],11),
              pl("a",S,*[(x+dx,y) for x,y in arm[1:]])]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["remada-alta-barra"] = ("Remada alta com barra em pegada fechada: barra junto às coxas e depois subindo até o peito com cotovelos acima dos ombros", emp_upright())

# ---------- ombro posterior ----------
def emp_bpa():
    o = []
    for dx, L, R in ((0, [(180,146)], [(200,146)]), (380, [(156,138),(128,138)], [(224,138),(252,138)])):
        Lp = [(x+dx,y) for x,y in L]; Rp = [(x+dx,y) for x,y in R]
        o += [ground(80+dx,330+dx)] + emp_ef(dx, Lp, Rp) + [emp_band(Lp[-1], Rp[-1])]
    o.append(labels("Início (de frente)","Fim",190,570)); return "".join(o)
F["band-pull-apart"] = ("Abertura de elástico de frente: mãos juntas à frente do peito e depois braços abertos esticando o elástico", emp_bpa())

def emp_bent(dx, L, R, db_pos):
    o = [ground(80+dx,330+dx), pl("i",(180+dx,192),(178+dx,230),(180+dx,268)), pl("i",(200+dx,192),(202+dx,230),(200+dx,268)), pl("i",(180+dx,192),(200+dx,192)),
         pl("i",(190+dx,192),(190+dx,182)), pl("i",(172+dx,182),(208+dx,182)), head(190+dx,164)]
    o += [pl("a",(172+dx,182),*[(x+dx,y) for x,y in L]), pl("a",(208+dx,182),*[(x+dx,y) for x,y in R])]
    return o
def emp_rear_bent():
    o = emp_bent(0,[(170,208),(170,234)],[(210,208),(210,234)],0) + [db(170,238,True), db(210,238,True)]
    o += emp_bent(380,[(146,184),(120,186)],[(234,184),(260,186)],0) + [db(500,186,True), db(640,186,True)]
    o = o[:]  # halteres do fim já na posição
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["crucifixo-invertido-curvado"] = ("Crucifixo invertido em pé com tronco curvado, de frente: braços pendurados e depois abertos até a linha dos ombros", emp_rear_bent())

def emp_rear_prone():
    o = []
    for dx, L, R in ((0, [(160,204),(158,232)], [(220,204),(222,232)]), (380, [(146,180),(120,182)], [(234,180),(260,182)])):
        Lp = [(x+dx,y) for x,y in L]; Rp = [(x+dx,y) for x,y in R]
        o += [ground(80+dx,330+dx), rect(172+dx,160,36,88,"e",6), line(190+dx,248,190+dx,270), line(170+dx,270,210+dx,270),
              pl("i",(172+dx,178),(208+dx,178)), head(190+dx,148), pl("a",(172+dx,178),*Lp), pl("a",(208+dx,178),*Rp),
              db(Lp[-1][0],Lp[-1][1]+6,True), db(Rp[-1][0],Rp[-1][1]+6,True)]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["crucifixo-invertido-halteres-apoio"] = ("Crucifixo invertido de bruços no banco inclinado, de frente: braços pendurados e depois abertos até a linha dos ombros", emp_rear_prone())

def emp_rev_peck():
    o = []
    for dx, L, R in ((0, [(156,176),(176,150)], [(224,176),(204,150)]), (380, [(150,214),(104,214)], [(230,214),(276,214)])):
        cx = 190+dx
        Lp = [(x+dx,y) for x,y in L]; Rp = [(x+dx,y) for x,y in R]
        o += [rect(cx-34,192,68,12,"e",4), pl("i",(cx-30,216),(cx+30,216)), pl("i",(cx,216),(cx,236)), head(cx,184),
              pl("a",(cx-30,216),*Lp), pl("a",(cx+30,216),*Rp), rect(Lp[-1][0]-5,Lp[-1][1]-5,10,10,"e",3), rect(Rp[-1][0]-5,Rp[-1][1]-5,10,10,"e",3)]
    o.append(labels("Início (visto de cima)","Fim",190,570)); return "".join(o)
F["crucifixo-invertido-maquina"] = ("Crucifixo invertido na máquina visto de cima: peito no apoio, braços à frente e depois abertos para trás até a linha dos ombros", emp_rev_peck())

def emp_facepull_band():
    o = []
    for dx, arm, h in ((0, [(170,140),(198,134),(226,128)], (226,128)), (380, [(170,140),(196,116),(210,128)], (210,128))):
        A,K,H,S,Hd = stand(dx-20)
        o += [ground(80+dx,330+dx), line(300+dx,80,300+dx,270), emp_pulley(300+dx,128), pl("i",A,K,H), pl("i",H,S), head(*Hd),
              pl("a",(S[0],S[1]),*[(x+dx,y) for x,y in arm[1:]]), emp_band((h[0]+dx,h[1]),(300+dx,128))]
    o.append(labels("Início","Fim",190,570)); return "".join(o)
F["face-pull-elastico"] = ("Face pull com elástico: braços estendidos à frente e depois mãos puxadas ao lado do rosto com cotovelos altos", emp_facepull_band())
