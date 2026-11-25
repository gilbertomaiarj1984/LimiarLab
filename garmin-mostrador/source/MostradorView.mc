import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// Data da prova (São Garrafa Run): 13/12/2026.
const PROVA_ANO = 2026;
const PROVA_MES = 12;
const PROVA_DIA = 13;
const LARANJA = 0xFFAA00;

// Número do dia no calendário (algoritmo "days from civil"): diferença entre dois dias = dias corridos.
function numeroDoDia(ano as Number, mes as Number, dia as Number) as Number {
    var a = ano;
    if (mes <= 2) {
        a -= 1;
    }
    var era = a / 400;
    var yoe = a - era * 400;
    var m = mes + (mes > 2 ? -3 : 9);
    var doy = (153 * m + 2) / 5 + dia - 1;
    var doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe;
}

class MostradorView extends WatchUi.WatchFace {
    hidden var logoSg;
    hidden var logoRr;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Dc) as Void {
        logoSg = WatchUi.loadResource(Rez.Drawables.SaoGarrafa);
        logoRr = WatchUi.loadResource(Rez.Drawables.Rafinha);
    }

    // Dias que faltam até a prova, pela data local do relógio (negativo = já passou).
    hidden function diasRestantes() as Number {
        var hoje = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        return numeroDoDia(PROVA_ANO, PROVA_MES, PROVA_DIA) - numeroDoDia(hoje.year, hoje.month, hoje.day);
    }

    function onUpdate(dc as Dc) as Void {
        var w = dc.getWidth();
        var cx = w / 2;
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        // Logos (já no tamanho final, 260 px de largura de referência).
        dc.drawBitmap(cx - logoSg.getWidth() / 2, 12, logoSg);
        dc.drawBitmap(cx - logoRr.getWidth() / 2, 190, logoRr);

        // Hora.
        var t = System.getClockTime();
        var h = t.hour;
        if (!System.getDeviceSettings().is24Hour) {
            h = h % 12;
            if (h == 0) {
                h = 12;
            }
        }
        var hora = h.format("%02d") + ":" + t.min.format("%02d");
        dc.drawText(cx, 118, Graphics.FONT_NUMBER_MEDIUM, hora, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Contagem regressiva.
        var d = diasRestantes();
        var yc = 164;
        if (d > 0) {
            var pre = WatchUi.loadResource(Rez.Strings.Faltam) + " ";
            var num = d.toString();
            var pos = " " + WatchUi.loadResource(d == 1 ? Rez.Strings.Dia : Rez.Strings.Dias);
            var fp = Graphics.FONT_TINY;
            var fn = Graphics.FONT_NUMBER_MILD;
            var wp = dc.getTextWidthInPixels(pre, fp);
            var wn = dc.getTextWidthInPixels(num, fn);
            var wo = dc.getTextWidthInPixels(pos, fp);
            var x = cx - (wp + wn + wo) / 2;
            var j = Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER;
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x, yc, fp, pre, j);
            dc.setColor(LARANJA, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x + wp, yc, fn, num, j);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x + wp + wn, yc, fp, pos, j);
        } else {
            dc.setColor(LARANJA, Graphics.COLOR_TRANSPARENT);
            var msg = WatchUi.loadResource(d == 0 ? Rez.Strings.Hoje : Rez.Strings.Concluida);
            dc.drawText(cx, yc, Graphics.FONT_MEDIUM, msg, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }
}
