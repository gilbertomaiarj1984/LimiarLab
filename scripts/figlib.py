# Biblioteca de desenho das figuras dos exercícios (mesmo estilo do treino de quinta).
# Cada figura é um corpo SVG em coordenadas 760x400 (viewBox "40 60 700 262"), dois quadros: início (x ~80-330) e fim (x ~460-710).
# Classes: i = membro parado, a = membro em trabalho (azul), e = cenário/aparelho (cinza), w = peso/halter, h = cabeça, p = alvo, x = marca de erro, d = linha de referência.
import os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
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


def pogo():
    out=[ground(80,330), ground(460,710)]
    for dx,dy in ((0,0),(390,-28)):
        A,K,H,S,Hd = stand(dx,dy)
        out += [pl("a",(A[0]+10,A[1]+2),A,K,H), pl("i",H,S), pl("i",S,(S[0]-4,S[1]+28),(S[0]+14,S[1]+44)), head(*Hd)]
    out += ['<path class="e" d="M630 252V196" marker-end="url(#arr)"/>', '<path class="e" d="M660 196V252" marker-end="url(#arr)"/>']
    out.append(labels("Apoio curto", "No ar", 200, 590))


def front(dx, armsL, armsR, c="a", lean=0):
    """Pessoa de frente (ombros e quadril como linhas). armsL/armsR: lista de pontos a partir do ombro."""
    sh=(190+dx+lean,136); hp=(190+dx,190)
    return [pl("i",(180+dx,190),(178+dx,268)), pl("i",(200+dx,190),(202+dx,268)), pl("i",(180+dx,190),(200+dx,190)),
            pl("i",hp,sh), pl("i",(sh[0]-18,sh[1]),(sh[0]+18,sh[1])), head(sh[0],sh[1]-22),
            pl(c,(sh[0]-18,sh[1]),*armsL), pl(c,(sh[0]+18,sh[1]),*armsR)]

STYLE = re.search(r'<style>(.*?)</style>', open(R + 'assets/svg/step-up.svg').read(), re.S).group(1)
DEFS = '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b8c3be"/></marker></defs>'

def svg(label, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 60 700 262" role="img" aria-label="{label}">\n<style>{STYLE}</style>\n{DEFS}\n<rect x="0" y="0" width="760" height="400" fill="#ffffff"/>\n{body}\n</svg>\n'
