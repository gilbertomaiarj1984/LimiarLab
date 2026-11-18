import Toybox.Application;
import Toybox.Application.Storage;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Timer;
import Toybox.WatchUi;

// Modo demonstração: só para as capturas de tela automáticas do simulador (o CI troca para true).
const DEMO = false;

const URL_PLANO = "https://limiar.143-95-214-240.sslip.io/api/relogio";
const MAX_SESSOES = 7;
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

class LimiarApp extends Application.AppBase {
    // Treinos mostrados no menu: { "nome", "rotulo", "ex" }.
    var sessoes = [];
    // Linha de estado do item "Atualizar".
    var estado = "";
    var noMenu = true;
    hidden var baixando = false;
    hidden var demoTimer;
    hidden var demoPasso = 0;
    hidden var demoView;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
        if (!DEMO && !carregarCache()) {
            usarEmbutido();
        }
        if (DEMO) {
            usarEmbutido();
        }
    }

    // Ao fechar o app por qualquer caminho, a atividade de Força em andamento é salva.
    function onStop(state) {
        Sessao.encerrar(true);
    }

    function getInitialView() {
        if (DEMO) {
            demoTimer = new Timer.Timer();
            demoTimer.start(method(:demoTick), 4000, true);
        } else {
            sincronizar();
        }
        return [criarMenu(), new TreinoMenuDelegate()];
    }

    // ---------- Plano: LimiarLab (via celular), cópia guardada no relógio ou treinos embutidos ----------

    function sincronizar() {
        if (RELOGIO_TOKEN.length() == 0) {
            estado = "Sem token: treinos fixos";
            return;
        }
        if (baixando) {
            return;
        }
        baixando = true;
        estado = "Atualizando...";
        Communications.makeWebRequest(URL_PLANO, null, {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => { "Authorization" => "Bearer " + RELOGIO_TOKEN },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:aoReceber));
    }

    function aoReceber(codigo as Number, dados) as Void {
        baixando = false;
        if (codigo == 200 && dados instanceof Dictionary && dados["sessoes"] instanceof Array) {
            guardar(dados);
            usarPlano(dados["sessoes"]);
            estado = "Atualizado " + dados["atualizado"];
        } else if (codigo == 401) {
            estado = "Token recusado";
        } else {
            estado = "Sem conexão (" + codigo + ")";
        }
        if (noMenu) {
            WatchUi.switchToView(criarMenu(), new TreinoMenuDelegate(), WatchUi.SLIDE_IMMEDIATE);
        }
    }

    // Uma chave por treino, para não estourar o limite de tamanho de cada valor guardado.
    function guardar(dados) {
        var ss = dados["sessoes"];
        var n = ss.size() < MAX_SESSOES ? ss.size() : MAX_SESSOES;
        try {
            for (var i = 0; i < n; i++) {
                Storage.setValue("sessao" + i, ss[i]);
            }
            Storage.setValue("plano", { "n" => n, "dia" => dados["hoje"], "hora" => dados["atualizado"] });
        } catch (e) {
            Storage.setValue("plano", null);
        }
    }

    function carregarCache() {
        var meta = Storage.getValue("plano");
        if (meta == null) {
            return false;
        }
        var ss = [];
        for (var i = 0; i < meta["n"]; i++) {
            var s = Storage.getValue("sessao" + i);
            if (s != null) {
                ss.add(s);
            }
        }
        usarPlano(ss);
        if (meta["dia"].equals(isoDe(Time.now()))) {
            estado = "Atualizado " + meta["hora"];
        } else {
            estado = "Atualizado em " + meta["dia"].substring(8, 10) + "/" + meta["dia"].substring(5, 7);
        }
        return true;
    }

    // Treinos vindos do LimiarLab: só de hoje em diante, com rótulo calculado aqui (o cache pode ser de ontem).
    function usarPlano(ss) {
        var hoje = numeroData(isoDe(Time.now()));
        var lista = [];
        for (var i = 0; i < ss.size(); i++) {
            var data = ss[i]["data"];
            if (numeroData(data) >= hoje) {
                lista.add({ "nome" => ss[i]["nome"], "rotulo" => rotulo(data), "ex" => ss[i]["ex"] });
            }
        }
        sessoes = lista;
    }

    // Treinos que vêm dentro do app (gerados de data/treinos), pelo dia da semana; o de hoje primeiro.
    function usarEmbutido() {
        var ss = WatchUi.loadResource(Rez.JsonData.treinos)["sessoes"];
        var hoje = DIAS_LONGOS[Gregorian.info(Time.now(), Time.FORMAT_SHORT).day_of_week - 1];
        var lista = [];
        for (var passo = 0; passo < 2; passo++) {
            for (var i = 0; i < ss.size(); i++) {
                var eHoje = ss[i]["dia"].equals(hoje);
                if ((passo == 0) == eHoje) {
                    lista.add({ "nome" => ss[i]["nome"], "rotulo" => eHoje ? "Hoje" : ss[i]["dia"], "ex" => ss[i]["ex"] });
                }
            }
        }
        sessoes = lista;
        estado = "Treinos fixos do app";
    }

    function criarMenu() {
        var menu = new WatchUi.Menu2({ :title => "Treino" });
        for (var i = 0; i < sessoes.size(); i++) {
            menu.addItem(new WatchUi.MenuItem(sessoes[i]["nome"], sessoes[i]["rotulo"] + ", " + sessoes[i]["ex"].size() + " exercícios", i, {}));
        }
        if (sessoes.size() == 0) {
            menu.addItem(new WatchUi.MenuItem("Sem treino de força", "nos próximos 7 dias", :nada, {}));
        }
        menu.addItem(new WatchUi.MenuItem("Atualizar", estado, :atualizar, {}));
        return menu;
    }

    function abrirTreino(indice) {
        noMenu = false;
        Sessao.iniciar();
        var view = new TreinoView(sessoes[indice]);
        WatchUi.switchToView(view, new TreinoDelegate(view), WatchUi.SLIDE_LEFT);
        return view;
    }

    // ---------- Datas ("AAAA-MM-DD") ----------

    function isoDe(momento) {
        var i = Gregorian.info(momento, Time.FORMAT_SHORT);
        return i.year.format("%04d") + "-" + i.month.format("%02d") + "-" + i.day.format("%02d");
    }

    function numeroData(iso) {
        return iso.substring(0, 4).toNumber() * 10000 + iso.substring(5, 7).toNumber() * 100 + iso.substring(8, 10).toNumber();
    }

    function rotulo(iso) {
        if (iso.equals(isoDe(Time.now()))) {
            return "Hoje";
        }
        if (iso.equals(isoDe(Time.now().add(new Time.Duration(86400))))) {
            return "Amanhã";
        }
        var m = Gregorian.moment({
            :year => iso.substring(0, 4).toNumber(),
            :month => iso.substring(5, 7).toNumber(),
            :day => iso.substring(8, 10).toNumber(),
            :hour => 12
        });
        var dia = DIAS_CURTOS[Gregorian.info(m, Time.FORMAT_SHORT).day_of_week - 1];
        return dia + " " + iso.substring(8, 10) + "/" + iso.substring(5, 7);
    }

    // Roteiro da demonstração: menu, exercício, descanso, próxima série, dicas (rolando), fim.
    function demoTick() as Void {
        demoPasso += 1;
        if (demoPasso == 1) {
            demoView = abrirTreino(0);
        } else if (demoPasso == 2) {
            demoView.acaoPrincipal();
        } else if (demoPasso == 3) {
            demoView.encurtarDescanso(3);
        } else if (demoPasso == 4) {
            demoView.abrirDetalhes();
        } else if (demoPasso == 5) {
            demoView.detalhe.rolar(1);
        } else if (demoPasso == 6) {
            demoView.detalhe.rolar(1);
        } else if (demoPasso == 7) {
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
            demoView.exIdx = demoView.exs.size() - 1;
            demoView.serie = demoView.exs[demoView.exIdx]["s"];
            demoView.acaoPrincipal();
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
        var id = item.getId();
        var app = getApp();
        if (id == :atualizar) {
            app.sincronizar();
            WatchUi.switchToView(app.criarMenu(), new TreinoMenuDelegate(), WatchUi.SLIDE_IMMEDIATE);
        } else if (id instanceof Number) {
            app.abrirTreino(id);
        }
    }
}
