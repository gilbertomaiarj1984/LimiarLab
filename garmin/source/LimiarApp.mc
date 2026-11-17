import Toybox.Application;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Timer;
import Toybox.WatchUi;

// Modo demonstração: só para as capturas de tela automáticas do simulador (o CI troca para true).
const DEMO = false;

class LimiarApp extends Application.AppBase {
    var treinos = [];
    hidden var demoTimer;
    hidden var demoPasso = 0;
    hidden var demoView;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
        treinos = WatchUi.loadResource(Rez.JsonData.treinos);
    }

    // Ao fechar o app por qualquer caminho, a atividade de Força em andamento é salva.
    function onStop(state) {
        Sessao.encerrar(true);
    }

    function getInitialView() {
        if (DEMO) {
            demoTimer = new Timer.Timer();
            demoTimer.start(method(:demoTick), 4000, true);
        }
        return [criarMenu(), new TreinoMenuDelegate()];
    }

    // Lista os treinos, com o de hoje no topo.
    function criarMenu() {
        var hoje = diaDeHoje();
        var menu = new WatchUi.Menu2({ :title => "Treino" });
        for (var i = 0; i < treinos.size(); i++) {
            if (treinos[i]["dia"].equals(hoje)) {
                menu.addItem(new WatchUi.MenuItem(treinos[i]["nome"], "Hoje, " + treinos[i]["ex"].size() + " exercícios", i, {}));
            }
        }
        for (var i = 0; i < treinos.size(); i++) {
            if (!treinos[i]["dia"].equals(hoje)) {
                menu.addItem(new WatchUi.MenuItem(treinos[i]["nome"], treinos[i]["dia"] + ", " + treinos[i]["ex"].size() + " exercícios", i, {}));
            }
        }
        return menu;
    }

    function diaDeHoje() {
        var nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
        var info = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        return nomes[info.day_of_week - 1];
    }

    function abrirTreino(indice) {
        Sessao.iniciar();
        var view = new TreinoView(treinos[indice]);
        WatchUi.switchToView(view, new TreinoDelegate(view), WatchUi.SLIDE_LEFT);
        return view;
    }

    // Roteiro da demonstração: menu, exercício, descanso, próximo exercício, detalhes, fim.
    function demoTick() as Void {
        demoPasso += 1;
        if (demoPasso == 1) {
            demoView = abrirTreino(0);
        } else if (demoPasso == 2) {
            demoView.acaoPrincipal();
        } else if (demoPasso == 3) {
            demoView.restante = 6;
        } else if (demoPasso == 5) {
            demoView.alternarDetalhes();
        } else if (demoPasso == 6) {
            demoView.alternarDetalhes();
            demoView.exIdx = demoView.exs.size() - 1;
            demoView.serie = demoView.exs[demoView.exIdx]["s"];
            demoView.acaoPrincipal();
            WatchUi.requestUpdate();
        } else if (demoPasso >= 8) {
            demoTimer.stop();
        }
    }
}

function getApp() as LimiarApp {
    return Application.getApp() as LimiarApp;
}

class TreinoMenuDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item) {
        getApp().abrirTreino(item.getId());
    }
}
