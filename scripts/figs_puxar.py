import sys; sys.path.insert(0,'/home/claude/repo/scripts')
from figlib import *
F = {}

def puxar_circ(x, y, r=14, c="w"): return f'<circle class="{c}" cx="{x}" cy="{y}" r="{r}"/>'
def puxar_cross(x, y, s=8): return line(x-s, y-s, x+s, y+s, "x") + line(x-s, y+s, x+s, y-s, "x")

# ---------- barra fixa (pendurado -> queixo acima da barra) ----------
def puxar_pullup(assist=False):
    o = [ground(80, 330), ground(460, 710)]
    for dx in (0, 380):
        o += [line(120+dx, 88, 262+dx, 88), line(262+dx, 88, 262+dx, 270)]
    # inicio: braços esticados
    S, E, H = (190, 148), (191, 118), (190, 88)
    # fim: queixo acima da barra
    S2, E2, H2 = (566, 102), (548, 124), (570, 88)
    if not assist:
        o += [pl("a", S, E, H), pl("i", S, (190, 196), (194, 232), (172, 258)), head(192, 132)]
        o += [pl("a", S2, E2, H2), pl("i", S2, (570, 150), (576, 186), (552, 212)), head(574, 78)]
    else:
        # ajoelhado na plataforma do graviton (a plataforma sobe junto)
        o += [rect(140, 238, 86, 8), line(226, 242, 250, 242), rect(250, 160, 18, 110)]
        o += [pl("a", S, E, H), pl("i", S, (190, 196), (200, 234), (160, 236)), head(192, 132)]
        o += [rect(520, 192, 86, 8), line(606, 196, 630, 196), rect(630, 160, 18, 110)]
        o += [pl("a", S2, E2, H2), pl("i", S2, (570, 150), (580, 188), (540, 190)), head(574, 78)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["barra-fixa"] = ("Barra fixa: início pendurado com braços esticados, fim com o queixo acima da barra", puxar_pullup())
F["barra-fixa-assistida"] = ("Barra fixa assistida na máquina: início ajoelhado na plataforma com braços esticados, fim com o queixo na altura da barra", puxar_pullup(True))

# ---------- pullover no cabo (braços retos, polia alta) ----------
def puxar_pull_cabo():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), line(318+dx, 70, 318+dx, 270), puxar_circ(306+dx, 80, 6, "e")]
        o += [pl("i", (190+dx, 268), (200+dx, 232), (186+dx, 196)), pl("i", (186+dx, 196), (170+dx, 232), (156+dx, 268))]
        o += [pl("i", (186+dx, 196), (198+dx, 148)), head(204+dx, 132)]
    o += [pl("a", (198, 148), (222, 128), (246, 108)), rect(242, 100, 8, 16, "w", 2), line(250, 104, 306, 80)]
    o += [pl("a", (578, 148), (584, 178), (590, 208)), rect(586, 206, 8, 16, "w", 2), line(594, 208, 686, 80)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["pullover-cabo"] = ("Pullover no cabo em pé: início com braços retos à frente na altura dos olhos, fim com as mãos junto às coxas", puxar_pull_cabo())

# ---------- pullover halter no banco ----------
def puxar_pull_halter():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), rect(120+dx, 224, 132, 8), line(138+dx, 232, 138+dx, 270), line(238+dx, 232, 238+dx, 270)]
        o += [pl("i", (156+dx, 214), (200+dx, 216)), pl("i", (200+dx, 216), (238+dx, 206), (242+dx, 266)), head(130+dx, 206)]
    # inicio: braços verticais sobre o peito, halter na vertical
    o += [pl("a", (156, 214), (157, 184), (157, 156)), rect(149, 140, 16, 16, "w", 3)]
    # fim: braços atrás da cabeça, cotovelos levemente dobrados
    o += [pl("a", (536, 214), (506, 217), (478, 232)), rect(462, 228, 16, 16, "w", 3)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["pullover-halter"] = ("Pullover com halter no banco: início com o halter sobre o peito, fim com o halter baixado atrás da cabeça", puxar_pull_halter())

# ---------- puxada atrás da nuca ----------
def puxar_nuca():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), rect(150+dx, 210, 64, 8), line(182+dx, 218, 182+dx, 270), rect(206+dx, 190, 22, 10, "p")]
        o += [pl("i", (176+dx, 206), (220+dx, 204), (222+dx, 262)), pl("i", (176+dx, 206), (178+dx, 158)), head(190+dx, 144)]
    # inicio: braços acima, barra acima da cabeça
    o += [pl("a", (178, 158), (176, 128), (172, 100)), rect(148, 96, 48, 7, "w"), line(172, 70, 172, 96)]
    # fim: barra atrás da nuca
    o += [pl("a", (558, 158), (550, 184), (546, 152)), rect(524, 148, 48, 7, "w"), line(546, 70, 546, 148)]
    o += [puxar_cross(646, 150, 10)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["puxada-atras-nuca"] = ("Puxada atrás da nuca na máquina: início com a barra acima da cabeça, fim com a barra descida atrás do pescoço (evite)", puxar_nuca())

# ---------- puxada com elástico (ajoelhado, ancorado no alto) ----------
def puxar_ajoelhado(dx, armc="a"):
    # ajoelhado: canela no chão, coxa vertical, tronco ereto
    return [pl("i", (166+dx, 268), (204+dx, 268), (198+dx, 228)), pl("i", (198+dx, 228), (198+dx, 180)), head(199+dx, 164)]

def puxar_elastico_pux():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), line(280+dx, 66, 330+dx, 66), line(330+dx, 66, 330+dx, 270), puxar_circ(300+dx, 72, 5, "e")]
        o += puxar_ajoelhado(dx)
    o += [pl("a", (198, 180), (218, 158), (240, 134)), line(240, 134, 300, 72, "d")]
    o += [pl("a", (578, 180), (566, 208), (600, 188)), line(600, 188, 680, 72, "d")]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["puxada-elastico"] = ("Puxada com elástico ancorado no alto: início ajoelhado com braços esticados, fim com as mãos no peito e cotovelos para baixo", puxar_elastico_pux())

# ---------- puxada unilateral no cabo ----------
def puxar_unilateral():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), rect(306+dx, 76, 26, 194), puxar_circ(300+dx, 76, 6, "e")]
        o += puxar_ajoelhado(dx)
        o += [pl("i", (198+dx, 180), (208+dx, 204), (214+dx, 230))]  # braço livre apoiado na coxa
    o += [pl("a", (198, 180), (220, 156), (242, 132)), rect(238, 126, 8, 14, "w", 2), line(242, 128, 300, 76)]
    o += [pl("a", (578, 180), (574, 210), (606, 190)), rect(602, 184, 8, 14, "w", 2), line(606, 188, 680, 76)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["puxada-unilateral-cabo"] = ("Puxada unilateral no cabo: início ajoelhado com um braço estendido para a polia alta, fim com o cotovelo junto ao quadril", puxar_unilateral())

# ---------- remada cavalinho (T-bar sem apoio) ----------
def puxar_tbar(dx, hand, elbow, hook):
    H = (166+dx, 196); S = (200+dx, 162)
    o = [ground(80+dx, 330+dx)]
    o += [pl("i", (192+dx, 232), (170+dx, 268)), pl("i", H, (192+dx, 232))]  # perna de trás
    o += [pl("i", H, (186+dx, 232), (174+dx, 268))]
    o += [pl("i", H, S), head(210+dx, 150)]
    o += [pl("a", S, (elbow[0], elbow[1]), hand)]
    return o

def puxar_cavalinho():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), puxar_circ(96+dx, 264, 5, "e")]
        o += [pl("i", (166+dx, 196), (190+dx, 232), (176+dx, 268)), pl("i", (166+dx, 196), (200+dx, 162)), head(210+dx, 150)]
    # inicio: braços pendurados
    o += [pl("a", (200, 162), (204, 192), (204, 222)), line(96, 264, 204, 222), line(204, 222, 270, 202), puxar_circ(272, 202, 16)]
    # fim: cotovelos atrás, mão no abdômen
    o += [pl("a", (580, 162), (556, 180), (586, 190)), line(476, 264, 586, 190), line(586, 190, 650, 148), puxar_circ(652, 147, 16)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-cavalinho"] = ("Remada cavalinho sem apoio: início com tronco inclinado e braços esticados, fim com a barra puxada ao abdômen e cotovelos atrás", puxar_cavalinho())

# ---------- remada curvada com barra ----------
def puxar_curvada():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx)]
        o += [pl("i", (166+dx, 196), (190+dx, 232), (176+dx, 268)), pl("i", (166+dx, 196), (200+dx, 162)), head(210+dx, 150)]
    o += [pl("a", (200, 162), (204, 192), (204, 222)), line(160, 222, 250, 222), puxar_circ(204, 222, 10)]
    o += [pl("a", (580, 162), (556, 180), (586, 190)), line(542, 190, 630, 190), puxar_circ(586, 190, 10)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-curvada-barra"] = ("Remada curvada com barra: início com tronco inclinado e barra pendurada, fim com a barra puxada ao abdômen", puxar_curvada())

# ---------- remada com elástico (sentado, elástico nos pés) ----------
def puxar_rem_elastico():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), pl("i", (150+dx, 262), (232+dx, 262)), puxar_circ(236+dx, 258, 5, "e")]
    o += [pl("i", (150, 262), (150, 214)), head(150, 198), pl("a", (150, 214), (180, 224), (210, 226)), line(212, 226, 236, 258, "d")]
    o += [pl("i", (530, 262), (530, 214)), head(528, 198), pl("a", (530, 214), (506, 232), (542, 238)), line(542, 238, 616, 258, "d")]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-elastico"] = ("Remada com elástico sentado: início com braços esticados segurando o elástico preso aos pés, fim com as mãos no abdômen e cotovelos atrás", puxar_rem_elastico())

# ---------- remada com halteres apoiada em banco inclinado (de bruços) ----------
def puxar_rem_peito():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), line(190+dx, 214, 251+dx, 169, "e"), line(190+dx, 218, 251+dx, 173, "e"), line(262+dx, 176, 262+dx, 270), line(196+dx, 222, 196+dx, 270)]
        o += [pl("i", (240+dx, 165), (202+dx, 193), (178+dx, 226), (158+dx, 264)), head(256+dx, 152)]
    o += [pl("a", (240, 165), (241, 195), (240, 224)), db(240, 228)]
    o += [pl("a", (620, 165), (592, 158), (596, 190)), db(596, 196)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-halter-apoio-peito"] = ("Remada com halteres de bruços no banco inclinado: início com braços pendurados, fim com os halteres puxados à lateral do tronco", puxar_rem_peito())

# ---------- remada invertida ----------
def puxar_invertida():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), line(196+dx, 90, 196+dx, 270), line(150+dx, 200, 196+dx, 200), puxar_circ(150+dx, 200, 5, "e")]
    # inicio: corpo reto, braços esticados
    o += [pl("i", (150, 258), (198, 261), (238, 263), (277, 266)), pl("a", (150, 258), (150, 229), (150, 200)), head(133, 254)]
    # fim: peito na barra, corpo reto
    o += [pl("i", (532, 208), (574, 230), (610, 248), (645, 268)), pl("a", (532, 208), (514, 232), (530, 198)), head(516, 200)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-invertida"] = ("Remada invertida na barra do smith: início com corpo reto e braços esticados, fim com o peito puxado até a barra", puxar_invertida())

# ---------- remada na máquina com apoio no peito ----------
def puxar_rem_maq():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), rect(150+dx, 228, 52, 8), line(176+dx, 236, 176+dx, 270), rect(200+dx, 150, 10, 64), line(205+dx, 156, 238+dx, 156), line(238+dx, 100, 238+dx, 270)]
        o += [pl("i", (176+dx, 222), (216+dx, 224), (218+dx, 266)), pl("i", (176+dx, 222), (194+dx, 178)), head(199+dx, 162)]
    o += [pl("a", (194, 178), (226, 180), (256, 182)), rect(252, 170, 8, 24, "e"), line(260, 182, 310, 182)]
    o += [pl("a", (574, 178), (546, 170), (594, 184)), rect(590, 172, 8, 24, "e"), line(598, 184, 690, 184)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-maquina-apoio-peito"] = ("Remada na máquina com apoio no peito: início com braços à frente, fim com cotovelos para trás e escápulas juntas", puxar_rem_maq())

# ---------- remada unilateral no cabo ----------
def puxar_rem_uni():
    o = []
    for dx in (0, 380):
        o += [ground(80+dx, 330+dx), line(338+dx, 150, 338+dx, 270), puxar_circ(324+dx, 196, 7, "e")]
        o += [pl("i", (190+dx, 196), (176+dx, 234), (158+dx, 268)), pl("i", (190+dx, 196), (210+dx, 232), (222+dx, 268))]
        o += [pl("i", (190+dx, 196), (192+dx, 148)), head(196+dx, 132), pl("i", (192+dx, 148), (206+dx, 176), (214+dx, 206))]
    o += [pl("a", (192, 148), (222, 160), (250, 172)), rect(248, 166, 8, 14, "w", 2), line(256, 172, 322, 196)]
    o += [pl("a", (572, 148), (554, 172), (586, 180)), rect(584, 174, 8, 14, "w", 2), line(592, 180, 702, 196)]
    o.append(labels("Início", "Fim", 190, 570))
    return "".join(o)
F["remada-unilateral-cabo"] = ("Remada unilateral no cabo: início com um braço estendido para a polia, fim com o cotovelo para trás junto ao tronco", puxar_rem_uni())
