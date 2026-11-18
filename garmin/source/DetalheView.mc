import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Explicação completa do exercício: séries, foco, ilustração (início e fim, uma embaixo da outra) e todas as dicas.
// UP/DOWN rolam o texto; BACK ou START voltam ao treino (o descanso continua contando).
class DetalheView extends WatchUi.View {
    hidden var ex;
    hidden var desloc = 0;
    hidden var alturaTotal = 0;
    hidden var alturaTela = 260;
    hidden var figs = [];

    function initialize(e) {
        View.initialize();
        ex = e;
    }

    function onShow() {
        var r = figuraDe(ex["g"]);
        figs = [];
        if (r != null) {
            for (var i = 0; i < r.size(); i++) {
                figs.add(WatchUi.loadResource(r[i]));
            }
        }
    }

    // Libera a memória das imagens ao sair da tela.
    function onHide() {
        figs = [];
    }

    // passo > 0 desce, < 0 sobe (um terço da tela por clique).
    function rolar(passo) {
        var max = alturaTotal - alturaTela + 30;
        if (max < 0) {
            max = 0;
        }
        desloc += passo * (alturaTela / 3);
        if (desloc > max) {
            desloc = max;
        }
        if (desloc < 0) {
            desloc = 0;
        }
        WatchUi.requestUpdate();
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var cx = w / 2;
        alturaTela = dc.getHeight();
        var y = 28 - desloc;
        // Largura fixa (não depende da rolagem, senão o texto mudaria de quebra ao rolar).
        var lw = w - 56;

        y = linhas(dc, cx, y, lw, Graphics.FONT_SMALL, COR_DESTAQUE, ex["n"], 4);
        if (ex["o"] != null && ex["o"].length() > 0) {
            y = linhas(dc, cx, y, lw, Graphics.FONT_XTINY, COR_SUAVE, "No lugar de: " + ex["o"], 3);
        }
        y += 4;
        var series = ex["s"] + " x " + ex["r"];
        if (ex["c"].length() > 0) {
            series += "  " + ex["c"];
        }
        y = linhas(dc, cx, y, lw, Graphics.FONT_TINY, Graphics.COLOR_WHITE, series, 2);
        y = linhas(dc, cx, y, lw, Graphics.FONT_XTINY, COR_SUAVE, ex["f"] + ", descanso " + ex["d"] + " s", 2);
        y += 6;
        for (var i = 0; i < figs.size(); i++) {
            dc.drawBitmap(cx - figs[i].getWidth() / 2, y, figs[i]);
            y += figs[i].getHeight() + 4;
        }
        y += 4;
        var dicas = ex["t"];
        for (var i = 0; i < dicas.size(); i++) {
            y = linhas(dc, cx, y, lw, Graphics.FONT_XTINY, Graphics.COLOR_WHITE, dicas[i], 99) + 8;
        }
        alturaTotal = y + desloc + 20;

        // Setas de rolagem na borda esquerda (onde ficam os botões UP/DOWN do 955): há conteúdo acima ou abaixo.
        dc.setColor(COR_DESTAQUE, Graphics.COLOR_TRANSPARENT);
        var xa = 12;
        var ym = alturaTela / 2;
        if (desloc > 0) {
            dc.fillPolygon([[xa - 6, ym - 14], [xa + 6, ym - 14], [xa, ym - 24]]);
        }
        if (alturaTotal - desloc > alturaTela) {
            dc.fillPolygon([[xa - 6, ym + 14], [xa + 6, ym + 14], [xa, ym + 24]]);
        }
    }
}

class DetalheDelegate extends WatchUi.BehaviorDelegate {
    hidden var view;

    function initialize(v) {
        BehaviorDelegate.initialize();
        view = v;
    }

    function onNextPage() {
        view.rolar(1);
        return true;
    }

    function onPreviousPage() {
        view.rolar(-1);
        return true;
    }

    function onSelect() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }

    function onBack() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }

    function onMenu() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }
}
