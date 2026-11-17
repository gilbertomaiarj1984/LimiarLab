import sys; sys.path.insert(0,'/home/claude/repo/scripts')
from figlib import *
import math
F = {}

def qd_ik(P, Q, l1=40, l2=40, side=1):
    """Articulação do meio (joelho/cotovelo) entre P e Q; side=+1/-1 escolhe o lado da dobra."""
    dx, dy = Q[0]-P[0], Q[1]-P[1]; d = math.hypot(dx, dy)
    d = min(d, l1+l2-0.5)
    a = (l1*l1 - l2*l2 + d*d)/(2*d); h = math.sqrt(max(l1*l1 - a*a, 0))
    ux, uy = dx/math.hypot(dx, dy), dy/math.hypot(dx, dy)
    return (round(P[0]+a*ux - side*h*uy, 1), round(P[1]+a*uy + side*h*ux, 1))

def qd_add(p, v, k=1): return (round(p[0]+k*v[0], 1), round(p[1]+k*v[1], 1))
def qd_circ(x, y, r=14, c="w"): return f'<circle class="{c}" cx="{x}" cy="{y}" r="{r}"/>'
def qd_lab(a, b, xa=190, xb=580): return ARROW + f'<text class="t" x="{xa}" y="310">{a}</text><text class="t" x="{xb}" y="310">{b}</text>'
def qd_two(f, la="Início", lb="Fim", xa=190, xb=580):
    return "".join([ground(80, 330), ground(460, 710), f(0, 1), f(390, 2), qd_lab(la, lb, xa, xb)])

# squat de lado: joelho à frente, tronco inclinado 'lean' px
def qd_sq(A, lean=14, ca="a", ct="i", arms=None, depth=1.0):
    K = (A[0]+30*depth, A[1]-30*depth)
    H = (A[0]-10*depth, A[1]-26*depth - (1-depth)*0)
    return K, H
def qd_squat_pts(A, lean=14, deep=True):
    if deep:
        K = (A[0]+30, A[1]-30); H = (A[0]-10, A[1]-26)
    else:
        K = (A[0]+1, A[1]-40); H = (A[0], A[1]-80)
    S = (H[0]+lean, H[1]-47); Hd = (S[0]+8, S[1]-16)
    return K, H, S, Hd

# ---------- 1 abdução no cabo em pé (de frente)
def abd_cabo(dx, n):
    o = [line(110+dx, 90, 110+dx, 270), rect(92+dx, 262, 40, 8), line(110+dx, 160, 142+dx, 160, "e")]
    hipL, hipR = (180+dx, 190), (200+dx, 190)
    sh = (172+dx, 136), (208+dx, 136)
    if n == 1: leg = [(200+dx, 190), (202+dx, 228), (203+dx, 266)]
    else: leg = [(200+dx, 190), (221+dx, 224), (242+dx, 254)]
    o += [line(112+dx, 262, leg[2][0], leg[2][1]), rect(leg[2][0]-6, leg[2][1]-5, 12, 8, "w", 2)]
    o += [pl("i", hipL, (178+dx, 268)), pl("i", hipL, hipR), pl("a", *leg), pl("i", (190+dx, 190), (190+dx, 136)),
          pl("i", *sh), head(190+dx, 114),
          pl("i", sh[0], (152+dx, 150), (142+dx, 160)), pl("i", sh[1], (214+dx, 160), (212+dx, 184))]
    return "".join(o)
F["abducao-cabo-em-pe"] = ("Abdução de quadril no cabo em pé, de frente: início com a perna ao lado da outra e fim com a perna afastada para o lado, tornozeleira presa à polia baixa", qd_two(abd_cabo))

# ---------- 2 abdução deitado de lado (de frente, deitado)
def abd_lat(dx, n):
    H = (190+dx, 254); S = (142+dx, 258)
    o = [pl("i", (H[0], 260), (H[0]+80, 261)), pl("i", S, (H[0], 260)), head(124+dx, 256),
         pl("i", (S[0]+4, 254), (S[0]+22, 238), (S[0]+34, 258))]
    top = (H[0]+80, 252) if n == 1 else (H[0]+69, 214)
    o.append(pl("a", H, top))
    if n == 2: o.append(f'<path class="e" d="M{H[0]+60} 246 Q{H[0]+66} 232 {H[0]+58} 220" fill="none"/>')
    return "".join(o)
F["abducao-deitado-lateral"] = ("Abdução deitado de lado, vista de frente: início com as pernas juntas e fim com a perna de cima elevada para o lado, joelho estendido", qd_two(abd_lat))

# ---------- 3 abdutora sentada (de frente)
def abdutora(dx, n):
    o = [rect(160+dx, 110, 60, 94, "e", 6), rect(158+dx, 202, 64, 8, "e")]
    kl, kr, fl, fr = ((180, 228), (200, 228), (178, 268), (202, 268)) if n == 1 else ((152, 226), (228, 226), (148, 268), (232, 268))
    pad = 8
    o += [rect(kl[0]-pad-8+dx, 214, 8, 26, "w", 2), rect(kr[0]+pad+dx, 214, 8, 26, "w", 2)]
    o += [pl("a", (184+dx, 192), (kl[0]+dx, kl[1]), (fl[0]+dx, fl[1])), pl("a", (196+dx, 192), (kr[0]+dx, kr[1]), (fr[0]+dx, fr[1])),
          pl("i", (184+dx, 192), (196+dx, 192)), pl("i", (190+dx, 192), (190+dx, 142)), pl("i", (172+dx, 142), (208+dx, 142)),
          head(190+dx, 120), pl("i", (172+dx, 142), (164+dx, 168), (170+dx, 196)), pl("i", (208+dx, 142), (216+dx, 168), (210+dx, 196))]
    return "".join(o)
F["abdutora-sentada"] = ("Abdutora sentada, de frente: início com os joelhos juntos e fim com as coxas abertas contra as almofadas, costas apoiadas", qd_two(abdutora))

# ---------- 4 concha com elástico (deitado de lado)
def concha(dx, n):
    H = (190+dx, 254); S = (142+dx, 258)
    kb = (236+dx, 262); kt = (232+dx, 254) if n == 1 else (238+dx, 224)
    ft = (208+dx, 256) if n == 1 else (210+dx, 254)
    o = [pl("i", S, (H[0], 260)), head(124+dx, 256), pl("i", (S[0]+4, 254), (S[0]+22, 238), (S[0]+34, 258)),
         pl("i", (H[0], 260), kb, (210+dx, 263)),
         pl("i", H, kt) if False else "", pl("a", H, kt, ft)]
    o.append(line(kt[0], kt[1]+3, kb[0], kb[1]-2, "e"))
    o.append(rect(min(kt[0], kb[0])-4, min(kt[1], kb[1])+2, 8, abs(kb[1]-kt[1])-2 if n == 2 else 6, "w", 2))
    return "".join(o)
F["concha-elastico"] = ("Concha com elástico, deitado de lado: início com os joelhos dobrados e juntos, fim com o joelho de cima aberto contra o elástico e os pés unidos", qd_two(concha))

# ---------- 5 monster walk (de frente)
def monster(dx, n):
    if n == 1: ft = [(160, 268), (220, 268)]; hip = [(180, 198), (200, 198)]; kn = [(166, 234), (214, 234)]
    else: ft = [(160, 268), (254, 268)]; hip = [(186, 198), (206, 198)]; kn = [(170, 234), (232, 234)]
    c = (hip[0][0]+hip[1][0])/2; sh = (c-18, 144), (c+18, 144)
    o = []
    for i in (0, 1): o.append(pl("a", (hip[i][0]+dx, hip[i][1]), (kn[i][0]+dx, kn[i][1]), (ft[i][0]+dx, ft[i][1])))
    o.append(rect(kn[0][0]+dx, 231, kn[1][0]-kn[0][0], 5, "w", 2))
    o += [pl("i", (hip[0][0]+dx, 198), (hip[1][0]+dx, 198)), pl("i", (c+dx, 198), (c+dx, 144)), pl("i", (sh[0][0]+dx, 144), (sh[1][0]+dx, 144)), head(c+dx, 122),
          pl("i", (sh[0][0]+dx, 144), (c-12+dx, 170), (c+dx, 162)), pl("i", (sh[1][0]+dx, 144), (c+12+dx, 170), (c+dx, 162))]
    if n == 2: o.append(f'<path class="e" d="M{ft[1][0]-30+dx} 288H{ft[1][0]+16+dx}" marker-end="url(#arr)"/>')
    return "".join(o)
F["monster-walk"] = ("Monster walk com elástico acima dos joelhos, de frente em semiagachamento: início com os pés na largura do quadril e fim com um passo lateral, elástico esticado", qd_two(monster, "Início", "Passo lateral", 190, 580))

# ---------- 6 agachamento espanhol
def espanhol(dx, n):
    o = [line(300+dx, 100, 300+dx, 270)]
    A = (190+dx, 268)
    if n == 1:
        K = (191+dx, 228); H = (188+dx, 188); S = (184+dx, 140); Hd = (183+dx, 124); hands = [(S[0], S[1]), (202+dx, 158), (222+dx, 150)]
    else:
        K = (190+dx, 228); H = (150+dx, 240); S = (130+dx, 197); Hd = (124+dx, 181); hands = [S, (160+dx, 192), (186+dx, 196)]
    o.append(rect(K[0]-4, 226, 300+dx-K[0]+4, 5, "w", 2))
    o += [pl("a", A, K, H), pl("i", H, S), pl("i", *hands), head(*Hd)]
    return "".join(o)
F["agachamento-espanhol"] = ("Agachamento espanhol com elástico, de lado: início em pé com o elástico atrás dos joelhos preso à frente, fim reclinado para trás com as canelas verticais e coxas paralelas ao chão", qd_two(espanhol))

# ---------- 7 goblet
def goblet(dx, n):
    A = (190+dx, 268)
    if n == 1:
        K, H, S, Hd = (191+dx, 228), (190+dx, 188), (190+dx, 140), (191+dx, 124); arm = [S, (196+dx, 168), (206+dx, 152)]; w = (208+dx, 150)
    else:
        K, H, S, Hd = qd_squat_pts(A, 6); arm = [S, (S[0]+4, S[1]+24), (S[0]+16, S[1]+8)]; w = (S[0]+17, S[1]+6)
    return "".join([db(*w, True), pl("a", A, K, H), pl("i", H, S), pl("i", *arm), head(*Hd)])
F["agachamento-goblet"] = ("Agachamento goblet, de lado: início em pé com o halter vertical junto ao peito, fim agachado com tronco alto e o halter entre os joelhos", qd_two(goblet))

# ---------- 8 hack
def hack(dx, n):
    A = (262+dx, 268)
    if n == 1: H, S, K = (210+dx, 213), (179+dx, 176), (245+dx, 232)
    else: H, S, K = (236+dx, 244), (205+dx, 207), (272+dx, 230)
    hd = (S[0]-10, S[1]-12)
    o = [line(160+dx, 172, 236+dx, 264), line(166+dx, 164, 242+dx, 256), rect(236+dx, 262, 50, 8, "e", 2),
         pl("a", A, K, H), pl("i", H, S), pl("i", S, (S[0]+14, S[1]+26), (S[0]+30, S[1]+30)), head(*hd)]
    # ombreiras
    o.append(rect(S[0]-4+dx*0, S[1]-12, 8, 8, "w", 2) if False else "")
    return "".join(o)
F["agachamento-hack"] = ("Agachamento hack na máquina, de lado: início em pé com costas e ombros apoiados na almofada inclinada, fim agachado com a coxa paralela à plataforma", qd_two(hack))

# ---------- 9 instável (bosu)
def bosu(dx, n):
    o = [f'<path class="e" d="M{125+dx} 270 A65 28 0 0 1 {255+dx} 270Z"/>']
    A = (190+dx, 245)
    if n == 1: K, H, S, Hd = (191+dx, 205), (190+dx, 165), (190+dx, 117), (191+dx, 101)
    else: K, H, S, Hd = qd_squat_pts(A, 14)
    arm = [S, (S[0]+22, S[1]+3), (S[0]+46, S[1]+3)]
    o += [pl("a", A, K, H), pl("i", H, S), pl("i", *arm), head(*Hd)]
    return "".join(o)
F["agachamento-instavel"] = ("Agachamento em superfície instável sobre bosu, de lado: início em pé sobre a cúpula com braços à frente, fim agachado sobre a cúpula", qd_two(bosu))

# ---------- 10 livre com barra
def livre(dx, n):
    o = [line(272+dx, 90, 272+dx, 270), line(252+dx, 236, 272+dx, 236)]
    A = (190+dx, 268)
    if n == 1: K, H, S, Hd = (191+dx, 228), (190+dx, 188), (190+dx, 140), (191+dx, 124)
    else: K, H, S, Hd = qd_squat_pts(A, 20)
    by = S[1]-5
    o += [rect(S[0]-46, by-4, 92, 8, "w"), pl("a", A, K, H), pl("i", H, S), pl("i", S, (S[0]-16, S[1]+10), (S[0]-4, by)), head(*Hd)]
    return "".join(o)
F["agachamento-livre"] = ("Agachamento livre com barra nas costas, de lado: início em pé com a barra no trapézio, fim agachado com a coxa paralela ao chão e tronco firme; rack com travas de segurança atrás", qd_two(livre))

# ---------- 11 leg press 45
def legpress(dx, n):
    H = (150+dx, 232); S = (121+dx, 194)
    A = (186+dx, 190) if n == 1 else (209+dx, 167)
    K = qd_ik(H, A, 40, 40, -1)
    P = (A[0]+6, A[1]-6); top = (P[0]-30*0.707, P[1]-30*0.707); bot = (P[0]+30*0.707, P[1]+30*0.707)
    o = [pl("e", (96+dx, 200), (140+dx, 246), (176+dx, 246)),
         line(bot[0]-60, bot[1]+60, bot[0]+95, bot[1]-95), pl("w", top, bot) if False else line(*top, *bot, "e"),
         pl("a", A, K, H), pl("i", H, S), pl("i", S, (S[0]+16, S[1]+30), (S[0]+34, S[1]+40)), head(S[0]-9, S[1]-14)]
    return "".join(o)
F["leg-press-45"] = ("Leg press 45 graus, de lado: início com joelhos dobrados e lombar no encosto, fim com as pernas quase estendidas sem trancar os joelhos", qd_two(legpress))

# ---------- 12 hiperextensão 45
def hiper(dx, n):
    u = (0.707, -0.707)
    H = (212+dx, 168); A = qd_add(H, u, -80); K = qd_add(H, u, -40)
    if n == 2: S = qd_add(H, u, 48); Hd = qd_add(S, u, 16)
    else: S = (H[0]+17, H[1]+45); Hd = (S[0]+7, S[1]+15)
    T = (H[0]+8, H[1]+8)
    o = [line(*qd_add(T, u, -115), *T), line(172+dx, 232, 172+dx, 270), line(T[0]-8, T[1]+2, T[0]-8, 270),
         rect(A[0]-14, A[1]+4, 8, 22, "w", 2),
         pl("a", A, K, H), pl("a", H, S), pl("i", S, (S[0]-10, S[1]+12), (S[0]-18, S[1]+4)), head(*Hd)]
    return "".join(o)
F["hiperextensao-45"] = ("Extensão de quadril no banco 45 graus, de lado: início com o tronco dobrado à frente a partir do quadril, fim com o corpo em linha reta, sem hiperestender a lombar", qd_two(hiper))

# ---------- 13 terra
def terra(dx, n):
    A = (190+dx, 268)
    if n == 1:
        H = (146+dx, 212); S = (187+dx, 187); K = qd_ik(H, A, 40, 40, -1); hand = (196+dx, 250)
        o = [qd_circ(*hand, 20), pl("a", A, K, H), pl("i", H, S), pl("i", S, hand), head(S[0]+14, S[1]-9)]
    else:
        K, H, S = (191+dx, 228), (190+dx, 188), (190+dx, 140); hand = (198+dx, 204)
        o = [qd_circ(*hand, 18), pl("a", A, K, H), pl("i", H, S), pl("i", S, (194+dx, 172), hand), head(191+dx, 124)]
    return "".join(o)
F["levantamento-terra"] = ("Levantamento terra convencional, de lado: início com a barra sobre o meio do pé, coluna neutra e quadril acima dos joelhos, fim em pé com a barra junto às coxas", qd_two(terra))

# ---------- 14 pull-through
def pull(dx, n):
    A = (190+dx, 268)
    o = [line(100+dx, 120, 100+dx, 270), rect(90+dx, 252, 20, 12, "e", 2)]
    if n == 1:
        H = (156+dx, 204); K = qd_ik(H, A, 40, 40, -1); S = (qd_add(H, (0.8, -0.6), 48)); hand = (188+dx, 232)
        arm = [S, (S[0]+2, S[1]+30), hand]
    else:
        K, H, S = (191+dx, 228), (190+dx, 188), (190+dx, 140); hand = (198+dx, 200); arm = [S, (194+dx, 170), hand]
    Hd = (S[0]+9, S[1]-14) if n == 1 else (191+dx, 124)
    o += [line(104+dx, 258, *hand), pl("a", A, K, H), pl("i", H, S), pl("i", *arm), head(*Hd), rect(hand[0]-5, hand[1]-4, 10, 8, "w", 2)]
    return "".join(o)
F["pull-through-cabo"] = ("Pull-through no cabo, de costas para a polia baixa: início com o quadril jogado para trás e a corda entre as pernas, fim em pé com o quadril estendido e glúteo contraído", qd_two(pull))

# ---------- 15 stiff unilateral
def stiffu(dx, n):
    A = (190+dx, 268)
    if n == 1:
        K, H, S, Hd = (191+dx, 228), (190+dx, 188), (190+dx, 140), (191+dx, 124)
        free = [H, (178+dx, 228), (160+dx, 250)]; hand = (196+dx, 206); arm = [S, (194+dx, 172), hand]
    else:
        H = (176+dx, 190); K = qd_ik(H, A, 40, 40, -1); S = (224+dx, 190); Hd = (240+dx, 186)
        free = [H, (136+dx, 192), (96+dx, 194)]; hand = (226+dx, 238); arm = [S, (225+dx, 214), hand]
    return "".join([pl("i", *free), pl("a", A, K, H), pl("i", H, S), pl("i", *arm), db(*hand), head(*Hd)])
F["stiff-unilateral"] = ("Stiff unilateral com halter, de lado: início em pé com a perna livre atrás, fim com o tronco inclinado à frente e a perna livre estendida para trás alinhada ao tronco, halter pendurado", qd_two(stiffu))

# ---------- 16 sissy
def sissy(dx, n):
    o = [line(258+dx, 110, 258+dx, 270)]
    if n == 1:
        A = (190+dx, 268); K, H, S, Hd = (191+dx, 228), (190+dx, 188), (190+dx, 140), (191+dx, 124); arm = [S, (222+dx, 152), (254+dx, 146)]
        foot = [A, (A[0]+12, 268)]
        leg = [A, K, H]
    else:
        A = (224+dx, 262); K = (242+dx, 226); H = (K[0]-20, K[1]-35); S = (H[0]-20, H[1]-44); Hd = (S[0]-8, S[1]-14)
        arm = [S, (S[0]+30, S[1]+10), (254+dx, 160)]; foot = [A, (A[0]+16, 268)]; leg = [A, K, H]
    o += [pl("i", *foot) if False else "", pl("i", *foot), pl("a", *leg), pl("i", H, S), pl("i", *arm), head(*Hd)]
    return "".join(o)
F["agachamento-sissy"] = ("Agachamento sissy, de lado: início em pé apoiando a mão no suporte, fim na ponta dos pés com os joelhos à frente e o corpo inclinado para trás em linha dos joelhos aos ombros", qd_two(sissy))

# ---------- 17 extensora
def extensora(dx, n):
    H = (150+dx, 214); K = (190+dx, 214); S = (144+dx, 166); Hd = (143+dx, 150)
    A = (193+dx, 254) if n == 1 else (224+dx, 193)
    o = [rect(118+dx, 222, 66, 8, "e"), line(150+dx, 230, 150+dx, 270), line(128+dx, 124, 140+dx, 222), line(*(168+dx, 204), *(186+dx, 228)) if False else "",
         line(K[0]-4, K[1]+10, A[0]-4, A[1]-4, "e"), rect(A[0]-4, A[1]-6, 8, 14, "w", 2), qd_circ(K[0]-4, K[1]+10, 4, "e"),
         pl("a", H, K, A), pl("i", H, S), pl("i", S, (S[0]+14, S[1]+26), (S[0]+30, S[1]+42)), head(*Hd)]
    return "".join(o)
F["cadeira-extensora"] = ("Cadeira extensora, de lado: início com o joelho dobrado a 90 graus e o rolo acima do tornozelo, fim com a perna quase estendida à frente", qd_two(extensora))

# ---------- 18 coice no cabo
def coice(dx, n):
    A = (200+dx, 268); K, H = (201+dx, 228), (200+dx, 188); S = (206+dx, 142); Hd = (210+dx, 126)
    o = [line(262+dx, 100, 262+dx, 270), rect(252+dx, 258, 20, 10, "e", 2)]
    if n == 1: work = [H, (192+dx, 228), (180+dx, 266)]
    else: work = [H, (172+dx, 216), (144+dx, 245)]
    o += [line(*work[2], 262+dx, 263, "e"), rect(work[2][0]-5, work[2][1]-5, 10, 8, "w", 2)]
    o += [pl("i", A, K, H), pl("a", *work), pl("i", H, S), pl("i", S, (234+dx, 160), (260+dx, 150)), head(*Hd)]
    return "".join(o)
F["coice-gluteo-cabo"] = ("Coice de glúteo no cabo, de lado: início em pé com a tornozeleira ligada à polia baixa à frente, fim com a perna levada para trás com o joelho estendido sem arquear a lombar", qd_two(coice))

# ---------- 19 elevação pélvica máquina
def elev(dx, n):
    A = (250+dx, 268)
    if n == 1: S = (165+dx, 218); H = (203+dx, 247)
    else: S = (165+dx, 240); H = (210+dx, 224)
    K = (250+dx, 228) if n == 2 else qd_ik(H, A, 40, 40, -1)
    dirn = ((H[0]-S[0])/math.hypot(H[0]-S[0], H[1]-S[1]), (H[1]-S[1])/math.hypot(H[0]-S[0], H[1]-S[1]))
    Hd = qd_add(S, dirn, -16)
    belt = (H[0]-2, H[1]-12)
    o = [rect(146+dx, 200, 12, 70, "e", 3), line(belt[0], belt[1], 126+dx, 252), rect(belt[0]-14, belt[1]-3, 28, 6, "w", 2),
         pl("a", A, K, H), pl("i", S, H), pl("i", S, (S[0]+22, S[1]-4), (S[0]+34, S[1]+22)) if False else "", head(*Hd)]
    return "".join(o)
F["elevacao-pelvica-maquina"] = ("Elevação pélvica na máquina, de lado: início sentado com as costas na almofada e o cinto sobre o quadril, fim com o quadril elevado, tronco e coxas alinhados e canelas verticais", qd_two(elev))

# ---------- 20 hip thrust
def thrust(dx, n, uni=False):
    S = (163+dx, 218); A = (246+dx, 268)
    H = (S[0]+38, S[1]+30) if n == 1 else (210+dx, 212)
    K = qd_ik(H, A, 40, 40, -1) if n == 1 else (246+dx, 230)
    dirn = (H[0]-S[0], H[1]-S[1]); L = math.hypot(*dirn); dirn = (dirn[0]/L, dirn[1]/L)
    Hd = qd_add(S, dirn, -16)
    o = [rect(112+dx, 224, 56, 46, "e", 3)]
    if uni:
        o.insert(0, db(H[0], H[1]-14))
        kf = (H[0]+16, H[1]-36); af = (kf[0]+28, kf[1]+22)
        o += [pl("i", H, kf, af), pl("a", A, K, H), pl("i", S, H), pl("i", S, (S[0]+22, S[1]+12), (H[0], H[1]-14)), head(*Hd)]
    else:
        o.insert(0, qd_circ(H[0], H[1]-14, 14))
        o += [pl("a", A, K, H), pl("i", S, H), pl("i", S, (S[0]+22, S[1]+12), (H[0], H[1]-14)), head(*Hd)]
    return "".join(o)
F["hip-thrust"] = ("Hip thrust com barra, de lado: início com as escápulas no banco e o quadril baixo, fim com o quadril elevado, tronco alinhado às coxas e canelas verticais", qd_two(thrust))

# ---------- 21 hip thrust unilateral
F["hip-thrust-unilateral"] = ("Hip thrust unilateral, de lado: início com as escápulas no banco, um pé no chão e a outra perna dobrada no ar, fim com o quadril elevado e nivelado sobre uma perna, halter sobre o quadril", qd_two(lambda dx, n: thrust(dx, n, True)))

# ---------- 22 ponte
def ponte(dx, n):
    A = (226+dx, 268)
    if n == 1: S = (130+dx, 262); H = (178+dx, 262); Hd = (112+dx, 262)
    else: S = (138+dx, 258); H = (178+dx, 230); Hd = (120+dx, 262)
    K = qd_ik(H, A, 40, 40, -1)
    return "".join([pl("a", A, K, H), pl("i", S, H), pl("i", S, (S[0]+30, 266)), head(*Hd)])
F["ponte-gluteo"] = ("Ponte de glúteo no chão, de lado: início deitado de costas com os joelhos dobrados e pés perto do quadril, fim com o quadril elevado e tronco alinhado às coxas", qd_two(ponte))
