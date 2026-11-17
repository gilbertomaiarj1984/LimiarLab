import Toybox.Activity;
import Toybox.Attention;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

const EXERCICIO = 0;
const DESCANSO = 1;
const FIM = 2;

const COR_DESTAQUE = 0xFF5500;
const COR_DESCANSO = 0x00AAFF;
const COR_SUAVE = 0xAAAAAA;

class TreinoView extends WatchUi.View {
    var treino;
    var exs;
    var exIdx = 0;
    var serie = 1;
    var estado = EXERCICIO;
    var restante = 0;
    var detalhes = false;
    hidden var timer;

    function initialize(t) {
        View.initialize();
        treino = t;
        exs = t["ex"];
        timer = new Timer.Timer();
    }

    function onShow() {
        timer.start(method(:tick), 1000, true);
    }

    function onHide() {
        timer.stop();
    }

    function tick() as Void {
        if (estado == DESCANSO) {
            restante -= 1;
            if (restante <= 0) {
                fimDescanso(true);
            } else if (restante == 10) {
                vibrar(150);
            }
        }
        WatchUi.requestUpdate();
    }

    // START: marca a série feita; no descanso, pula o descanso; no fim, salva e sai.
    function acaoPrincipal() {
        if (estado == FIM) {
            Sessao.encerrar(true);
            System.exit();
        }
        if (estado == DESCANSO) {
            fimDescanso(false);
            return;
        }
        Sessao.volta();
        var ex = exs[exIdx];
        restante = ex["d"];
        if (serie < ex["s"]) {
            serie += 1;
            estado = DESCANSO;
        } else if (exIdx < exs.size() - 1) {
            exIdx += 1;
            serie = 1;
            estado = DESCANSO;
        } else {
            estado = FIM;
            vibrar(600);
        }
        detalhes = false;
        WatchUi.requestUpdate();
    }

    function fimDescanso(alerta) {
        Sessao.volta();
        estado = EXERCICIO;
        if (alerta) {
            vibrar(800);
            if (Attention has :playTone) {
                Attention.playTone(Attention.TONE_LOUD_BEEP);
            }
        }
        WatchUi.requestUpdate();
    }

    // UP/DOWN: troca de exercício (para pular ou voltar).
    function mudarExercicio(delta) {
        if (estado == FIM) {
            return;
        }
        var novo = exIdx + delta;
        if (novo < 0 || novo >= exs.size()) {
            return;
        }
        exIdx = novo;
        serie = 1;
        estado = EXERCICIO;
        detalhes = false;
        WatchUi.requestUpdate();
    }

    // Segurar UP (menu): mostra as dicas do exercício.
    function alternarDetalhes() {
        detalhes = !detalhes;
        WatchUi.requestUpdate();
    }

    function vibrar(ms) {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(100, ms)]);
        }
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var cx = w / 2;
        if (estado == FIM) {
            desenharFim(dc, cx);
        } else if (detalhes) {
            desenharDetalhes(dc, w, cx);
        } else if (estado == DESCANSO) {
            desenharDescanso(dc, w, cx);
        } else {
            desenharExercicio(dc, w, cx);
        }
        desenharRodape(dc, cx, dc.getHeight());
    }

    function desenharExercicio(dc, w, cx) {
        var ex = exs[exIdx];
        texto(dc, cx, 22, Graphics.FONT_XTINY, COR_SUAVE, "Exercício " + (exIdx + 1) + "/" + exs.size());
        var y = linhas(dc, cx, 46, w - 50, Graphics.FONT_SMALL, Graphics.COLOR_WHITE, ex["n"], 2);
        y += 4;
        texto(dc, cx, y, Graphics.FONT_MEDIUM, COR_DESTAQUE, "Série " + serie + " de " + ex["s"]);
        y += dc.getFontHeight(Graphics.FONT_MEDIUM);
        // Reps e carga (% de 1RM) na mesma linha; se não couber, só as reps.
        var linha = ex["r"];
        if (ex["c"].length() > 0) {
            var comCarga = ex["r"] + "  " + ex["c"];
            if (dc.getTextWidthInPixels(comCarga, Graphics.FONT_TINY) <= w - 40) {
                linha = comCarga;
            }
        }
        texto(dc, cx, y, Graphics.FONT_TINY, Graphics.COLOR_WHITE, linha);
        y += dc.getFontHeight(Graphics.FONT_TINY);
        var hx = dc.getFontHeight(Graphics.FONT_XTINY);
        var limite = dc.getHeight() - 46;
        // O próximo exercício só aparece se couber acima do rodapé (nomes longos ocupam 2 linhas).
        if (y + hx <= limite) {
            if (exIdx < exs.size() - 1) {
                linhas(dc, cx, y, w - 70, Graphics.FONT_XTINY, COR_SUAVE, "Próx: " + exs[exIdx + 1]["n"], 1);
            } else {
                texto(dc, cx, y, Graphics.FONT_XTINY, COR_SUAVE, "Último exercício");
            }
        }
    }

    function desenharDescanso(dc, w, cx) {
        var ex = exs[exIdx];
        texto(dc, cx, 22, Graphics.FONT_XTINY, COR_DESCANSO, "DESCANSO");
        var tempo = (restante / 60) + ":" + (restante % 60).format("%02d");
        texto(dc, cx, 40, Graphics.FONT_NUMBER_HOT, COR_DESCANSO, tempo);
        var y = 40 + dc.getFontHeight(Graphics.FONT_NUMBER_HOT);
        texto(dc, cx, y, Graphics.FONT_XTINY, COR_SUAVE, "A seguir");
        y += dc.getFontHeight(Graphics.FONT_XTINY);
        if (serie == 1) {
            y = linhas(dc, cx, y, w - 60, Graphics.FONT_TINY, Graphics.COLOR_WHITE, ex["n"], 2);
        }
        texto(dc, cx, y, Graphics.FONT_TINY, COR_DESTAQUE, "Série " + serie + " de " + ex["s"] + ", " + ex["r"]);
    }

    function desenharDetalhes(dc, w, cx) {
        var ex = exs[exIdx];
        texto(dc, cx, 22, Graphics.FONT_XTINY, COR_DESTAQUE, ex["f"]);
        var y = 44;
        var dicas = ex["t"];
        for (var i = 0; i < dicas.size() && y < 200; i++) {
            y = linhas(dc, cx, y, w - 40, Graphics.FONT_XTINY, Graphics.COLOR_WHITE, dicas[i], 3) + 4;
        }
    }

    function desenharFim(dc, cx) {
        texto(dc, cx, 60, Graphics.FONT_SMALL, COR_DESTAQUE, "Treino concluído");
        texto(dc, cx, 100, Graphics.FONT_NUMBER_MILD, Graphics.COLOR_WHITE, tempoTotal());
        texto(dc, cx, 160, Graphics.FONT_XTINY, COR_SUAVE, "START salva e sai");
    }

    function desenharRodape(dc, cx, h) {
        var info = Activity.getActivityInfo();
        var fc = "--";
        if (info != null && info.currentHeartRate != null) {
            fc = info.currentHeartRate.toString();
        }
        texto(dc, cx, h - 46, Graphics.FONT_XTINY, Graphics.COLOR_WHITE, tempoTotal() + "   FC " + fc);
    }

    function tempoTotal() {
        var info = Activity.getActivityInfo();
        var s = 0;
        if (info != null && info.timerTime != null) {
            s = info.timerTime / 1000;
        }
        return (s / 60) + ":" + (s % 60).format("%02d");
    }

    function texto(dc, x, y, fonte, cor, s) {
        dc.setColor(cor, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, fonte, s, Graphics.TEXT_JUSTIFY_CENTER);
    }

    // Quebra o texto em até `max` linhas centralizadas; devolve o y logo abaixo da última.
    function linhas(dc, x, y, largura, fonte, cor, s, max) {
        var palavras = dividir(s);
        var atual = "";
        var n = 0;
        var altura = dc.getFontHeight(fonte);
        for (var i = 0; i < palavras.size(); i++) {
            var teste = atual.length() == 0 ? palavras[i] : atual + " " + palavras[i];
            if (dc.getTextWidthInPixels(teste, fonte) > largura && atual.length() > 0) {
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
}

class TreinoDelegate extends WatchUi.BehaviorDelegate {
    hidden var view;

    function initialize(v) {
        BehaviorDelegate.initialize();
        view = v;
    }

    function onSelect() {
        view.acaoPrincipal();
        return true;
    }

    function onNextPage() {
        view.mudarExercicio(1);
        return true;
    }

    function onPreviousPage() {
        view.mudarExercicio(-1);
        return true;
    }

    function onMenu() {
        view.alternarDetalhes();
        return true;
    }

    // BACK: pergunta o que fazer, para nunca perder o treino sem querer.
    function onBack() {
        var menu = new WatchUi.Menu2({ :title => "Sair?" });
        menu.addItem(new WatchUi.MenuItem("Continuar", null, :continuar, {}));
        menu.addItem(new WatchUi.MenuItem("Salvar e sair", null, :salvar, {}));
        menu.addItem(new WatchUi.MenuItem("Descartar", null, :descartar, {}));
        WatchUi.pushView(menu, new SairDelegate(), WatchUi.SLIDE_UP);
        return true;
    }
}

class SairDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item) {
        var id = item.getId();
        if (id == :salvar) {
            Sessao.encerrar(true);
            System.exit();
        } else if (id == :descartar) {
            WatchUi.pushView(new WatchUi.Confirmation("Descartar o treino?"), new DescartarDelegate(), WatchUi.SLIDE_UP);
        } else {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
        }
    }
}

class DescartarDelegate extends WatchUi.ConfirmationDelegate {
    function initialize() {
        ConfirmationDelegate.initialize();
    }

    function onResponse(resposta) {
        if (resposta == WatchUi.CONFIRM_YES) {
            Sessao.encerrar(false);
            System.exit();
        }
        return true;
    }
}
