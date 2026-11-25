import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class MostradorApp extends Application.AppBase {
    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() {
        return [new MostradorView()];
    }
}
