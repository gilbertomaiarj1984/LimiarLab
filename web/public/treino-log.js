// Acompanhamento do treino de força: marcar as séries feitas e contar o descanso.
// Script simples sobre o HTML da página (sem React), para funcionar igual no app e no preview.
// As marcas ficam só neste aparelho (localStorage), por treino e por dia; nada vai ao servidor.
(function () {
  if (window.__llTreino) return;
  window.__llTreino = true;

  var mem = {};
  function get(k) { try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {} return mem[k] == null ? null : mem[k]; }
  function put(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function state(log) { try { return JSON.parse(get(log.dataset.key) || "{}") || {}; } catch (e) { return {}; } }

  function setId(b) { return b.closest(".wo-card").dataset.ex + "-" + b.dataset.set; }

  function hydrate(log) {
    if (!log || log.dataset.ready) return;
    log.dataset.ready = "1";
    var st = state(log);
    log.querySelectorAll(".wo-set").forEach(function (b) { b.setAttribute("aria-pressed", st[setId(b)] ? "true" : "false"); });
  }
  function save(log) {
    var st = {};
    log.querySelectorAll('.wo-set[aria-pressed="true"]').forEach(function (b) { st[setId(b)] = true; });
    put(log.dataset.key, JSON.stringify(st));
  }

  // Contador de descanso, pelo horário de término (continua certo se a tela apagar).
  var end = 0, tick = null, curLog = null;
  function paint() {
    var b = curLog && curLog.querySelector(".wo-rest"); if (!b) return;
    var left = Math.max(0, Math.round((end - Date.now()) / 1000));
    if (left <= 0) { stop(true); return; }
    b.hidden = false;
    var m = Math.floor(left / 60), s = left % 60;
    b.querySelector("b").textContent = m + ":" + (s < 10 ? "0" : "") + s;
  }
  function beep() {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var ctx = new A(), o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.35);
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(300); } catch (e) {}
  }
  function stop(finished) {
    clearInterval(tick); tick = null; end = 0;
    document.querySelectorAll(".wo-rest").forEach(function (b) { b.hidden = true; });
    if (finished) beep();
  }
  function start(log, s) { curLog = log; end = Date.now() + s * 1000; clearInterval(tick); tick = setInterval(paint, 250); paint(); }
  window.__llTreinoStop = function () { stop(false); };
  window.__llTreinoHydrate = function (root) { (root || document).querySelectorAll(".wo-log").forEach(hydrate); };

  document.addEventListener("click", function (ev) {
    var log = ev.target.closest && ev.target.closest(".wo-log"); if (!log) return;
    var b = ev.target.closest(".wo-set");
    if (b) {
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) start(log, Number(b.closest(".wo-card").dataset.rest) || 75);
      save(log);
      return;
    }
    if (ev.target.closest(".wo-plus")) { end += 15000; paint(); return; }
    if (ev.target.closest(".wo-skip")) { stop(false); return; }
    if (ev.target.closest(".wo-reset")) {
      log.querySelectorAll(".wo-set").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      save(log); stop(false);
    }
  });

  window.__llTreinoHydrate();
  // Navegação do app sem recarregar a página: hidrata quando um treino novo aparece.
  new MutationObserver(function () { window.__llTreinoHydrate(); }).observe(document.body, { childList: true, subtree: true });
})();
