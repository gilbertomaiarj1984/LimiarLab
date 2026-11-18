import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;

// Ajudantes de texto compartilhados pelas telas (tela redonda: a largura útil muda com a altura).

function texto(dc, x, y, fonte, cor, s) {
    dc.setColor(cor, Graphics.COLOR_TRANSPARENT);
    dc.drawText(x, y, fonte, s, Graphics.TEXT_JUSTIFY_CENTER);
}

// Largura útil numa linha que vai de y a y + altura, numa tela redonda, com margem.
function larguraUtil(dc, y, altura) {
    var r = dc.getWidth() / 2.0;
    var meio = dc.getHeight() / 2.0;
    // a ponta da linha mais longe do centro manda
    var d = y - meio;
    if (d < 0) {
        d = -d;
    }
    var d2 = y + altura - meio;
    if (d2 < 0) {
        d2 = -d2;
    }
    if (d2 > d) {
        d = d2;
    }
    if (d >= r) {
        return 0;
    }
    return (2 * Math.sqrt(r * r - d * d) - 24).toNumber();
}

// Quebra o texto em até `max` linhas centralizadas; devolve o y logo abaixo da última.
// largura <= 0: usa a largura útil da tela redonda em cada linha.
function linhas(dc, x, y, largura, fonte, cor, s, max) {
    var palavras = dividir(s);
    var atual = "";
    var n = 0;
    var altura = dc.getFontHeight(fonte);
    for (var i = 0; i < palavras.size(); i++) {
        var lim = largura > 0 ? largura : larguraUtil(dc, y, altura);
        if (lim < 60) {
            lim = 60;
        }
        var teste = atual.length() == 0 ? palavras[i] : atual + " " + palavras[i];
        if (dc.getTextWidthInPixels(teste, fonte) > lim && atual.length() > 0) {
            n += 1;
            if (n == max) {
                texto(dc, x, y, fonte, cor, atual + "...");
                return y + altura;
            }
            texto(dc, x, y, fonte, cor, atual);
            y += altura;
            atual = palavras[i];
        } else {
            atual = teste;
        }
    }
    if (atual.length() > 0) {
        texto(dc, x, y, fonte, cor, atual);
        y += altura;
    }
    return y;
}

function dividir(s) {
    var partes = [];
    var resto = s;
    var i = resto.find(" ");
    while (i != null) {
        if (i > 0) {
            partes.add(resto.substring(0, i));
        }
        resto = resto.substring(i + 1, resto.length());
        i = resto.find(" ");
    }
    if (resto.length() > 0) {
        partes.add(resto);
    }
    return partes;
}
