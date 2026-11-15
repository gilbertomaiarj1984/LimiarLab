# Figuras novas dos exercícios (terça e superiores), em coordenadas, no estilo das de quinta.
# Figuras novas no mesmo estilo das de quinta: dois quadros (início/fim), traço .i, membro em trabalho .a.
def pl(c, *pts): return f'<polyline class="{c}" points="' + " ".join(f"{x},{y}" for x, y in pts) + '"/>'
def head(x, y): return f'<circle class="h" cx="{x}" cy="{y}" r="10"/>'
def ground(x1, x2, y=270): return f'<line class="e" x1="{x1}" y1="{y}" x2="{x2}" y2="{y}"/>'
def line(x1, y1, x2, y2, c="e"): return f'<line class="{c}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'
def rect(x, y, w, h, c="e", rx=3): return f'<rect class="{c}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'
def db(x, y, vertical=False):  # halter visto de lado
    return rect(x - 4, y - 10, 8, 20, "w", 2) if vertical else rect(x - 10, y - 4, 20, 8, "w", 2)
ARROW = '<path class="e" d="M345 170H435" marker-end="url(#arr)"/>'
def labels(a="Início", b="Fim", xa=200, xb=590, y=310): return (ARROW if (a, b) == ("Início", "Fim") else "") + f'<text class="t" x="{xa}" y="{y}">{a}</text><text class="t" x="{xb}" y="{y}">{b}</text>'
def stand(dx=0, dy=0, legc="i"):
    """Em pé de lado (virado para a direita): devolve partes e articulações."""
    A=(190+dx,268+dy); K=(191+dx,228+dy); H=(190+dx,188+dy); S=(190+dx,140+dy); Hd=(191+dx,124+dy)
    return A,K,H,S,Hd
F = {}

# 1 Pogo
def pogo():
    out=[ground(80,330), ground(460,710)]
    for dx,dy in ((0,0),(390,-28)):
        A,K,H,S,Hd = stand(dx,dy)
        out += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(S[0]-4,S[1]+28),(S[0]+14,S[1]+44)), head(*Hd)]
    out += ['<path class="e" d="M630 252V196" marker-end="url(#arr)"/>', '<path class="e" d="M660 196V252" marker-end="url(#arr)"/>']
    out.append(labels("Apoio curto", "No ar", 200, 590))
    return "".join(out)
F["pogo"] = ("Saltitos de tornozelo: apoio e voo", pogo())

# 2 Agachamento no smith
def smith():
    o=[ground(80,330), ground(460,710), line(140,90,140,270), line(250,90,250,270), line(520,90,520,270), line(660,90,660,270)]
    A,K,H,S,Hd = stand()
    o += [pl("a",A,K,H), pl("i",H,S), rect(150,134,90,8,"w"), pl("i",S,(176,160),(180,140)), head(*Hd)]
    # fundo: coxa paralela
    A2=(580,268); K2=(614,234); H2=(572,230); S2=(596,186)
    o += [pl("a",A2,K2,H2), pl("i",H2,S2), rect(530,180,120,8,"w"), pl("i",S2,(584,206),(586,186)), head(601,171)]
    o.append(labels())
    return "".join(o)
F["agachamento-smith"] = ("Agachamento no smith: início e fim", smith())

# 3 Búlgaro
def bulgaro():
    o=[ground(80,330), ground(460,710), rect(226,222,70,48), rect(616,222,70,48)]
    o += [pl("a",(150,268),(156,228),(178,190)), pl("i",(178,190),(204,228),(238,222)), pl("i",(178,190),(174,142)), pl("i",(174,142),(174,170),(174,196)), db(174,200,True), head(173,126)]
    o += [pl("a",(530,268),(548,232),(588,234)), pl("i",(588,234),(600,262),(632,224)), pl("i",(588,234),(582,186)), pl("i",(582,186),(580,212),(578,236)), db(578,240,True), head(581,170)]
    o.append(labels("Início", "Fim", 190, 580))
    return "".join(o)
F["bulgaro"] = ("Agachamento búlgaro: início e fim", bulgaro())

# 4 Stiff
def stiff():
    o=[ground(80,330), ground(460,710)]
    A,K,H,S,Hd = stand()
    o += [pl("i",A,K), pl("a",K,H), pl("i",H,S), pl("i",S,(190,166),(190,194)), rect(176,192,28,10,"w"), head(*Hd)]
    A2=(590,268); K2=(596,230); H2=(566,196); S2=(610,176)
    o += [pl("i",A2,K2), pl("a",K2,H2), pl("i",H2,S2), pl("i",S2,(610,204),(610,232)), rect(596,230,28,10,"w"), head(624,168)]
    o.append(labels())
    return "".join(o)
F["stiff"] = ("Stiff: início e fim", stiff())

# 5 Puxada frontal / neutra
def puxada(neutra=False):
    o=[]
    for dx in (0,380):
        o += [ground(80+dx,330+dx), rect(150+dx,210,64,8), line(182+dx,218,182+dx,270), rect(206+dx,190,22,10,"p"), line(184+dx,62,184+dx,70)]
        o += [pl("i",(176+dx,206),(220+dx,204),(222+dx,262)), pl("i",(176+dx,206),(172+dx,158)), head(171+dx,142)]
    o += [pl("a",(172,158),(178,128),(184,100)), rect(162,96,44,7,"w"), line(184,70,184,96)]
    o += [pl("a",(552,158),(560,182),(576,152)), rect(556,148,42,7,"w"), line(584,70,578,148)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["puxada"] = ("Puxada: início e fim", puxada())

# 6 Remada baixa
def remada():
    o=[]
    for dx in (0,380):
        o += [ground(80+dx,330+dx), rect(118+dx,232,64,8), line(150+dx,240,150+dx,270), rect(244+dx,206,8,48), line(256+dx,226,280+dx,226)]
        o += [pl("i",(150+dx,226),(200+dx,214),(240+dx,226)), pl("i",(150+dx,226),(148+dx,178)), head(148+dx,162)]
    o += [pl("a",(148,178),(176,184),(204,190)), rect(202,184,10,12,"w"), line(212,190,256,226)]
    o += [pl("a",(528,178),(508,196),(538,204)), rect(536,198,10,12,"w"), line(546,204,636,226)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["remada-baixa"] = ("Remada baixa: início e fim", remada())

# 7 Supino inclinado
def sup_inc():
    o=[]
    for dx in (0,380):
        o += [ground(80+dx,330+dx), pl("e",(118+dx,160),(182+dx,220),(244+dx,220)), line(182+dx,220,182+dx,270)]
        o += [pl("i",(186+dx,214),(226+dx,212),(228+dx,262)), pl("i",(186+dx,214),(142+dx,176)), head(132+dx,162)]
    o += [pl("a",(142,176),(146,204),(166,184)), db(166,180)]
    o += [pl("a",(522,176),(532,148),(542,120)), db(542,116)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["supino-inclinado"] = ("Supino inclinado: início e fim", sup_inc())

# 8 Desenvolvimento
def desenv():
    o=[]
    for dx in (0,380):
        o += [ground(80+dx,330+dx), rect(160+dx,210,52,8), line(186+dx,218,186+dx,270), line(160+dx,212,154+dx,124)]
        o += [pl("i",(178+dx,206),(220+dx,206),(222+dx,262)), pl("i",(178+dx,206),(176+dx,158)), head(176+dx,142)]
    o += [pl("a",(176,158),(194,176),(194,146)), db(194,142)]
    o += [pl("a",(556,158),(560,128),(562,100)), db(562,96)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["desenvolvimento"] = ("Desenvolvimento: início e fim", desenv())

# 9 Face pull
def facepull():
    o=[]
    for dx in (0,380):
        A,K,H,S,Hd = stand(dx-20)
        o += [ground(80+dx,330+dx), line(286+dx,80,286+dx,270), f'<circle class="e" cx="{286+dx}" cy="128" r="6"/>', pl("i",A,K,H), pl("i",H,S), head(*Hd)]
    o += [pl("a",(170,140),(198,134),(226,128)), line(226,128,280,128)]
    o += [pl("a",(550,140),(536,124),(566,116)), line(566,116,660,128)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["face-pull"] = ("Face pull: início e fim", facepull())

# 10 Rosca direta
def rosca():
    o=[]
    for dx in (0,380):
        A,K,H,S,Hd = stand(dx)
        o += [ground(80+dx,330+dx), pl("i",A,K,H), pl("i",H,S), head(*Hd)]
    o += [pl("a",(190,140),(196,170),(200,198)), db(200,202,True)]
    o += [pl("a",(570,140),(570,170),(592,150)), db(596,146)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["rosca-direta"] = ("Rosca direta: início e fim", rosca())

# 11 Tríceps na polia
def triceps():
    o=[]
    for dx in (0,380):
        A,K,H,S,Hd = stand(dx-10)
        o += [ground(80+dx,330+dx), line(240+dx,80,240+dx,270), f'<circle class="e" cx="{234+dx}" cy="92" r="6"/>', pl("i",A,K,H), pl("i",H,S), head(*Hd)]
    o += [pl("a",(180,140),(182,170),(208,164)), line(208,164,232,96)]
    o += [pl("a",(560,140),(562,170),(568,198)), line(568,198,612,96)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["triceps-polia"] = ("Tríceps na polia: início e fim", triceps())

# 12 Serrote
def serrote():
    o=[]
    for dx in (0,380):
        o += [ground(80+dx,330+dx), rect(130+dx,206,100,10), line(140+dx,216,140+dx,270), line(220+dx,216,220+dx,270)]
        o += [pl("i",(214+dx,190),(206+dx,204),(236+dx,204)), pl("i",(214+dx,190),(246+dx,230),(250+dx,268)), pl("i",(214+dx,190),(166+dx,178)), pl("i",(166+dx,178),(160+dx,206)), head(150+dx,170)]
    o += [pl("a",(170,180),(176,208),(178,236)), db(178,240,True)]
    o += [pl("a",(550,180),(580,166),(586,194)), db(586,198,True)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["serrote"] = ("Remada serrote: início e fim", serrote())

# 13 Supino reto
def sup_reto():
    o=[]
    for dx in (0,380):
        o += [ground(80+dx,330+dx), rect(110+dx,206,140,8), line(130+dx,214,130+dx,270), line(230+dx,214,230+dx,270)]
        o += [pl("i",(196+dx,200),(238+dx,190),(244+dx,262)), pl("i",(196+dx,200),(146+dx,200)), head(130+dx,196)]
    o += [pl("a",(146,200),(156,218),(160,188)), db(160,184)]
    o += [pl("a",(526,200),(528,170),(530,140)), db(530,136)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["supino-reto"] = ("Supino reto: início e fim", sup_reto())

# 14 Elevação lateral (de frente)
def front(dx, armsL, armsR, c="a", lean=0):
    sh=(190+dx+lean,136); hp=(190+dx,190)
    return [pl("i",(180+dx,190),(178+dx,268)), pl("i",(200+dx,190),(202+dx,268)), pl("i",(180+dx,190),(200+dx,190)),
            pl("i",hp,sh), pl("i",(sh[0]-18,sh[1]),(sh[0]+18,sh[1])), head(sh[0],sh[1]-22),
            pl(c,(sh[0]-18,sh[1]),*armsL), pl(c,(sh[0]+18,sh[1]),*armsR)]
def elev():
    o=[ground(80,330), ground(460,710)]
    o += front(0,[(168,166),(166,194)],[(212,166),(214,194)]) + [db(166,198,True), db(214,198,True)]
    o += front(380,[(522,136),(494,138)],[(618,136),(646,138)]) + [db(490,138,True), db(650,138,True)]
    o.append(labels("Início","Fim",190,570))
    return "".join(o)
F["elevacao-lateral"] = ("Elevação lateral, de frente: início e fim", elev())

# 15 Rosca martelo + tríceps francês
def martelo_frances():
    o=[]
    for dx in (0,380):
        A,K,H,S,Hd = stand(dx)
        o += [ground(80+dx,330+dx), pl("i",A,K,H), pl("i",H,S), head(*Hd)]
    o += [pl("a",(190,140),(190,170),(206,144)), db(208,140,True)]
    o += [pl("a",(570,140),(578,108),(556,124)), db(552,128,True)]
    o.append(labels("Rosca martelo","Tríceps francês",190,570))
    return "".join(o)
F["martelo-frances"] = ("Rosca martelo e tríceps francês", martelo_frances())

# 16 Pallof press (visto de cima)
def pallof():
    o=[]
    for dx in (0,380):
        o += [f'<circle class="e" cx="{100+dx}" cy="160" r="8"/>', f'<circle class="h" cx="{200+dx}" cy="196" r="13"/>', pl("i",(170+dx,196),(230+dx,196))]
    o += [pl("a",(170,196),(182,174),(200,168)), pl("a",(230,196),(218,174),(200,168)), line(108,160,200,168)]
    o += [pl("a",(550,196),(564,152),(580,118)), pl("a",(610,196),(596,152),(580,118)), line(488,160,580,118)]
    o.append(labels("Início (visto de cima)","Fim",190,570))
    return "".join(o)
F["pallof"] = ("Pallof press visto de cima: início e fim", pallof())

# 17 Suitcase carry (de frente): certo e evite
def carry():
    o=[ground(80,330), ground(460,710), f'<line class="d" x1="190" y1="90" x2="190" y2="268"/>']
    o += front(0,[(170,166),(170,196)],[(210,166),(210,196)],"i") + [db(210,200,True)]
    o += front(380,[(548,166),(548,196)],[(590,166),(588,196)],"i",lean=12) + [db(588,200,True), '<circle class="x" cx="592" cy="140" r="16"/>']
    o.append(labels("Certo","Evite",190,570))
    return "".join(o)
F["suitcase-carry"] = ("Caminhada com halter numa mão: certo e evite", carry())
