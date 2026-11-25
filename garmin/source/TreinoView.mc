import Toybox.Activity;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.PersistedContent;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

const EXERCICIO = 0;
const DESCANSO = 1;
const FIM = 2;
// Treino salvo: avisando o LimiarLab para marcá-lo como feito.
const ENVIO = 3;

// Resultado do aviso ao LimiarLab (envio).
const ENVIO_PENDENTE = 0;
const ENVIO_OK = 1;
const ENVIO_FALHOU = 2;
const ENVIO_RECUSADO = 3;
// Tempos, em milissegundos: espera máxima pela resposta e quanto tempo o "sincronizado" fica na tela.
const ENVIO_LIMITE_MS = 25000;
const ENVIO_SAIDA_MS = 2500;

const COR_DESTAQUE = 0xFF5500;
const COR_DESCANSO = 0x00AAFF;
const COR_SUAVE = 0xAAAAAA;
const COR_FEITO = 0x00CC66;

// Segundos somados ou subtraídos do descanso a cada clique em UP/DOWN.
const PASSO_DESCANSO = 10;

class TreinoView extends WatchUi.View {
    var treino;
    var exs;
    var exIdx = 0;
    // Séries concluídas de cada exercício; vale até o fim do treino, em qualquer ordem de execução.
    var feitas;
    var exAnterior = 0;
    var estado = EXERCICIO;
    var restante = 0;
    var detalhe = null;
    var envio = ENVIO_PENDENTE;
    hidden var envioMs = 0;
    hidden var saidaMs = 0;
    hidden var fimMs = 0;
    hidden var avisou = false;
    hidden var timer;

    // O contador roda mesmo com a tela de dicas aberta, pelo horário de término do descanso.
    function initialize(t) {
        View.initialize();
        treino = t;
        exs = t["ex"];
        feitas = new [exs.size()];
        for (var i = 0; i < feitas.size(); i++) {
            feitas[i] = 0;
        }
        timer = new Timer.Timer();
        timer.start(method(:tick), 1000, true);
    }

    function tick() as Void {
        if (estado == DESCANSO) {
            restante = (fimMs - System.getTimer() + 999) / 1000;
            if (restante <= 0) {
                restante = 0;
                fimDescanso(true);
            } else if (restante <= 10 && !avisou) {
                avisou = true;
                vibrar(150);
            }
        }
        if (estado == ENVIO) {
            var agora = System.getTimer();
            if (envio == ENVIO_PENDENTE && agora - envioMs > ENVIO_LIMITE_MS) {
                envio = ENVIO_FALHOU;
            } else if (envio == ENVIO_OK && agora - saidaMs > ENVIO_SAIDA_MS) {
                System.exit();
            }
        }
        WatchUi.requestUpdate();
    }

    function comecarDescanso(seg) {
        estado = DESCANSO;
        restante = seg;
        avisou = seg <= 10;
        fimMs = System.getTimer() + seg * 1000;
    }

    // Só para a demonstração do simulador.
    function encurtarDescanso(seg) {
        if (estado == DESCANSO) {
            comecarDescanso(seg);
        }
    }

    // Série a fazer no exercício atual (1ª série ainda não feita); o total, se já concluído.
    function serieAtual() {
        var ex = exs[exIdx];
        if (feitas[exIdx] >= ex["s"]) {
            return ex["s"];
        }
        return feitas[exIdx] + 1;
    }

    function concluido(i) {
        return feitas[i] >= exs[i]["s"];
    }

    function totalConcluidos() {
        var n = 0;
        for (var i = 0; i < exs.size(); i++) {
            if (concluido(i)) {
                n += 1;
            }
        }
        return n;
    }

    // Próximo exercício com séries pendentes depois do atual (volta ao começo se preciso); -1 se não há.
    function proximoPendente() {
        var n = exs.size();
        for (var k = 1; k < n; k++) {
            var i = (exIdx + k) % n;
            if (!concluido(i)) {
                return i;
            }
        }
        return -1;
    }

    // START: marca a série feita; no descanso, pula o descanso; no fim, salva e sai.
    function acaoPrincipal() {
        if (estado == FIM) {
            finalizar();
            return;
        }
        if (estado == ENVIO) {
            sairDoEnvio();
            return;
        }
        if (estado == DESCANSO) {
            fimDescanso(false);
            return;
        }
        var ex = exs[exIdx];
        if (concluido(exIdx)) {
            // Exercício já concluído (visto ao navegar): nada a marcar.
            return;
        }
        Sessao.volta();
        feitas[exIdx] += 1;
        exAnterior = exIdx;
        if (concluido(exIdx)) {
            var p = proximoPendente();
            if (p < 0) {
                estado = FIM;
                vibrar(600);
                WatchUi.requestUpdate();
                return;
            }
            exIdx = p;
        }
        comecarDescanso(ex["d"]);
        WatchUi.requestUpdate();
    }

    // Salva a atividade e avisa o LimiarLab quais séries foram feitas, para o treino ficar como feito lá.
    // Sem nenhuma série marcada, ou sem token / treino do LimiarLab (treinos fixos do app), só salva e sai.
    function finalizar() {
        Sessao.encerrar(true);
        var total = 0;
        for (var i = 0; i < feitas.size(); i++) {
            total += feitas[i];
        }
        if (total == 0 || treino["slug"] == null || treino["dia"] == null || RELOGIO_TOKEN.length() == 0) {
            System.exit();
            return;
        }
        estado = ENVIO;
        envio = ENVIO_PENDENTE;
        envioMs = System.getTimer();
        Communications.makeWebRequest(URL_CONCLUIR, { "treino" => treino["slug"], "dia" => treino["dia"], "series" => feitas }, {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => { "Authorization" => "Bearer " + RELOGIO_TOKEN, "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:aoEnviar));
        WatchUi.requestUpdate();
    }

    function aoEnviar(codigo as Number, dados as Dictionary or String or PersistedContent.Iterator or Null) as Void {
        if (codigo == 200) {
            envio = ENVIO_OK;
            saidaMs = System.getTimer();
        } else if (codigo == 422 || codigo == 401) {
            envio = ENVIO_RECUSADO;
        } else {
            envio = ENVIO_FALHOU;
        }
        WatchUi.requestUpdate();
    }

    // O treino já está salvo na Garmin: sair é seguro, mas só depois da resposta (ou da falha) do aviso.
    function sairDoEnvio() {
        if (envio != ENVIO_PENDENTE) {
            System.exit();
        }
    }

    // UP/DOWN no descanso: soma ou subtrai segundos da contagem; chegando a zero, o descanso termina.
    function ajustarDescanso(delta) {
        if (estado != DESCANSO) {
            return;
        }
        fimMs += delta * 1000;
        restante = (fimMs - System.getTimer() + 999) / 1000;
        if (restante <= 0) {
            restante = 0;
            fimDescanso(false);
            return;
        }
        if (restante > 5999) {
            restante = 5999;
            fimMs = System.getTimer() + restante * 1000;
        }
        avisou = restante <= 10;
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

    // UP/DOWN: no descanso, ajusta a contagem; no exercício, troca de exercício (as séries feitas ficam guardadas).
    // delta > 0 é DOWN (próximo / menos tempo), delta < 0 é UP (anterior / mais tempo).
    function botaoVertical(delta) {
        if (estado == FIM || estado == ENVIO) {
            return;
        }
        if (estado == DESCANSO) {
            ajustarDescanso(-delta * PASSO_DESCANSO);
            return;
        }
        var novo = exIdx + delta;
        if (novo < 0 || novo >= exs.size()) {
            return;
        }
        exIdx = novo;
        WatchUi.requestUpdate();
    }

    // Segurar UP (menu): abre a explicação completa do exercício, com ilustração e rolagem.
    function abrirDetalhes() {
        if (estado == FIM || estado == ENVIO) {
            return;
        }
        detalhe = new DetalheView(exs[exIdx]);
        WatchUi.pushView(detalhe, new DetalheDelegate(detalhe), WatchUi.SLIDE_UP);
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
        if (estado == ENVIO) {
            desenharEnvio(dc, cx);
            return;
        }
        if (estado == FIM) {
            desenharFim(dc, cx);
        } else if (estado == DESCANSO) {
            desenharDescanso(dc, w, cx);
        } else {
            desenharExercicio(dc, w, cx);
        }
        desenharRodape(dc, cx, dc.getHeight());
    }

    function desenharExercicio(dc, w, cx) {
        var ex = exs[exIdx];
        var topo = "Exercício " + (exIdx + 1) + "/" + exs.size();
        var feitos = totalConcluidos();
        if (feitos > 0) {
            var comFeitos = topo + "  feitos " + feitos;
            if (dc.getTextWidthInPixels(comFeitos, Graphics.FONT_XTINY) <= w - 60) {
                topo = comFeitos;
            }
        }
        if (ex["o"] != null && ex["o"].length() > 0) {
            var comTroca = topo + " (trocado)";
            if (dc.getTextWidthInPixels(comTroca, Graphics.FONT_XTINY) <= w - 60) {
                topo = comTroca;
            }
        }
        texto(dc, cx, 22, Graphics.FONT_XTINY, COR_SUAVE, topo);
        var y = linhas(dc, cx, 46, w - 50, Graphics.FONT_SMALL, Graphics.COLOR_WHITE, ex["n"], 2);
        y += 4;
        if (concluido(exIdx)) {
            texto(dc, cx, y, Graphics.FONT_MEDIUM, COR_FEITO, "Concluído");
        } else {
            texto(dc, cx, y, Graphics.FONT_MEDIUM, COR_DESTAQUE, "Série " + serieAtual() + " de " + ex["s"]);
        }
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
            var prox = proximoPendente();
            if (prox >= 0) {
                linhas(dc, cx, y, w - 70, Graphics.FONT_XTINY, COR_SUAVE, "Próx: " + exs[prox]["n"], 1);
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
        if (exIdx != exAnterior) {
            y = linhas(dc, cx, y, w - 60, Graphics.FONT_TINY, Graphics.COLOR_WHITE, ex["n"], 2);
        }
        texto(dc, cx, y, Graphics.FONT_TINY, COR_DESTAQUE, "Série " + serieAtual() + " de " + ex["s"] + ", " + ex["r"]);
    }

    function desenharFim(dc, cx) {
        texto(dc, cx, 60, Graphics.FONT_SMALL, COR_DESTAQUE, "Treino concluído");
        texto(dc, cx, 100, Graphics.FONT_NUMBER_MILD, Graphics.COLOR_WHITE, tempoTotal());
        texto(dc, cx, 160, Graphics.FONT_XTINY, COR_SUAVE, "START salva e sincroniza");
    }

    function desenharEnvio(dc, cx) {
        if (envio == ENVIO_PENDENTE) {
            texto(dc, cx, 70, Graphics.FONT_SMALL, COR_DESTAQUE, "Treino salvo");
            texto(dc, cx, 110, Graphics.FONT_TINY, Graphics.COLOR_WHITE, "Sincronizando...");
        } else if (envio == ENVIO_OK) {
            texto(dc, cx, 70, Graphics.FONT_SMALL, COR_FEITO, "Sincronizado");
            texto(dc, cx, 110, Graphics.FONT_TINY, Graphics.COLOR_WHITE, "Treino marcado como feito");
        } else {
            texto(dc, cx, 60, Graphics.FONT_SMALL, COR_DESTAQUE, "Treino salvo");
            texto(dc, cx, 100, Graphics.FONT_TINY, Graphics.COLOR_WHITE, envio == ENVIO_RECUSADO ? "LimiarLab não aceitou" : "Sem conexão");
            texto(dc, cx, 130, Graphics.FONT_XTINY, COR_SUAVE, "Confirme no app do celular");
            texto(dc, cx, 160, Graphics.FONT_XTINY, COR_SUAVE, "START sai");
        }
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
        view.botaoVertical(1);
        return true;
    }

    function onPreviousPage() {
        view.botaoVertical(-1);
        return true;
    }

    function onMenu() {
        view.abrirDetalhes();
        return true;
    }

    // BACK: pergunta o que fazer, para nunca perder o treino sem querer.
    function onBack() {
        if (view.estado == ENVIO) {
            view.sairDoEnvio();
            return true;
        }
        var menu = new WatchUi.Menu2({ :title => "Sair?" });
        menu.addItem(new WatchUi.MenuItem("Continuar", null, :continuar, {}));
        menu.addItem(new WatchUi.MenuItem("Salvar e sair", null, :salvar, {}));
        menu.addItem(new WatchUi.MenuItem("Descartar", null, :descartar, {}));
        WatchUi.pushView(menu, new SairDelegate(view), WatchUi.SLIDE_UP);
        return true;
    }
}

class SairDelegate extends WatchUi.Menu2InputDelegate {
    hidden var view;

    function initialize(v) {
        Menu2InputDelegate.initialize();
        view = v;
    }

    function onSelect(item) {
        var id = item.getId();
        if (id == :salvar) {
            // Fecha o menu e salva; o que foi marcado até aqui vai para o LimiarLab.
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
            view.finalizar();
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
