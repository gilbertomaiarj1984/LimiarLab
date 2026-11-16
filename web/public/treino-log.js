// Registro do treino de força: carga e reps por série, contador de descanso e resumo para copiar.
// Script simples sobre o HTML da página (sem React), para funcionar igual no app e no preview.
// Os dados ficam só neste aparelho (localStorage), por treino e por dia; nada vai ao servidor.
(function () {
  if (window.__llTreino) return;
  window.__llTreino = true;

  var mem = {};
  function get(k) { try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {} return mem[k] == null ? null : mem[k]; }
  function put(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function readJSON(k) { try { return JSON.parse(get(k) || "null"); } catch (e) { return null; } }

  function num(s) { s = String(s || "").replace(",", ".").trim(); if (!s) return null; var n = Number(s); return isFinite(n) && n >= 0 ? n : null; }
  function fmt(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }

  // Estado de um treino: { "1-2": { kg: "30", reps: "10", done: true }, ... }
  function state(log) { return readJSON(log.dataset.key) || {}; }
  function save(log, st) { put(log.dataset.key, JSON.stringify(st)); }

  function rows(log) { return log.querySelectorAll(".wo-row"); }
  function rowId(row) { return row.closest(".wo-card").dataset.ex + "-" + row.dataset.set; }

  function hydrate(log) {
    if (!log || log.dataset.ready) return;
    log.dataset.ready = "1";
    var st = state(log);
    log.querySelectorAll(".wo-card").forEach(function (card) {
      var last = readJSON("ll:ultimo:" + card.dataset.name);
      card.querySelectorAll(".wo-row").forEach(function (row) {
        var s = st[rowId(row)] || {};
        var kg = row.querySelector(".wo-kg"), reps = row.querySelector(".wo-reps"), b = row.querySelector(".wo-set");
        kg.value = s.kg || ""; reps.value = s.reps || "";
        if (last && last.kg) kg.placeholder = "últ. " + last.kg;
        b.setAttribute("aria-pressed", s.done ? "true" : "false");
      });
    });
    summary(log);
  }

  function collect(log) {
    var st = {};
    rows(log).forEach(function (row) {
      var kg = row.querySelector(".wo-kg").value.trim(), reps = row.querySelector(".wo-reps").value.trim();
      var done = row.querySelector(".wo-set").getAttribute("aria-pressed") === "true";
      if (kg || reps || done) st[rowId(row)] = { kg: kg, reps: reps, done: done };
    });
    save(log, st);
    return st;
  }

  function summary(log) {
    var out = log.querySelector(".wo-out"), lines = [], total = 0, vol = 0, nSets = 0;
    log.querySelectorAll(".wo-card").forEach(function (card) {
      var parts = [];
      card.querySelectorAll(".wo-row").forEach(function (row) {
        if (row.querySelector(".wo-set").getAttribute("aria-pressed") !== "true") return;
        var kg = num(row.querySelector(".wo-kg").value), reps = num(row.querySelector(".wo-reps").value);
        parts.push((kg != null ? fmt(kg) + " kg" : "? kg") + " × " + (reps != null ? fmt(reps) : "?"));
        nSets++;
        if (kg != null && reps != null) vol += kg * reps;
      });
      total += card.querySelectorAll(".wo-row").length;
      if (parts.length) lines.push(card.dataset.ex + ". " + card.dataset.name + ": " + parts.join(" · "));
    });
    var head = "LimiarLab · " + log.dataset.title + " · " + log.dataset.daylabel;
    var text = nSets
      ? head + "\n" + lines.join("\n") + "\n" + nSets + " de " + total + " séries" + (vol ? " · volume " + fmt(Math.round(vol)) + " kg" : "")
      : "";
    out.textContent = text || "Nenhuma série marcada ainda. Anote carga e reps e toque no ✓ ao terminar cada série.";
    out.dataset.text = text;
    var c = log.querySelector(".wo-count"); if (c) c.textContent = nSets + " de " + total + " séries";
  }

  // Contador de descanso, pelo horário de término (continua certo se a tela apagar).
  var end = 0, tick = null, curLog = null;
  function bar(log) { return log && log.querySelector(".wo-rest"); }
  function paint() {
    var b = bar(curLog); if (!b) return;
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
      if (on) {
        var row = b.closest(".wo-row"), card = row.closest(".wo-card");
        var kg = row.querySelector(".wo-kg").value.trim();
        // Repete a carga na próxima série vazia, que é o caso mais comum.
        var next = row.nextElementSibling;
        if (kg && next && next.classList.contains("wo-row") && !next.querySelector(".wo-kg").value) next.querySelector(".wo-kg").value = kg;
        if (kg) put("ll:ultimo:" + card.dataset.name, JSON.stringify({ kg: kg, day: log.dataset.day }));
        start(log, Number(card.dataset.rest) || 75);
      }
      collect(log); summary(log);
      return;
    }
    if (ev.target.closest(".wo-plus")) { end += 15000; paint(); return; }
    if (ev.target.closest(".wo-skip")) { stop(false); return; }
    if (ev.target.closest(".wo-reset")) {
      if (log.dataset.armed !== "1") {
        log.dataset.armed = "1";
        var r = ev.target.closest(".wo-reset"); r.textContent = "Toque de novo para apagar";
        setTimeout(function () { log.dataset.armed = ""; r.textContent = "Zerar registro"; }, 3000);
        return;
      }
      log.dataset.armed = "";
      rows(log).forEach(function (row) {
        row.querySelector(".wo-kg").value = ""; row.querySelector(".wo-reps").value = "";
        row.querySelector(".wo-set").setAttribute("aria-pressed", "false");
      });
      ev.target.closest(".wo-reset").textContent = "Zerar registro";
      save(log, {}); stop(false); summary(log);
      return;
    }
    if (ev.target.closest(".wo-copy")) {
      var out = log.querySelector(".wo-out"), t = out.dataset.text, btn = ev.target.closest(".wo-copy");
      if (!t) return;
      var done = function () { btn.textContent = "Copiado ✓"; setTimeout(function () { btn.textContent = "Copiar registro"; }, 2000); };
      var fallback = function () {
        var sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(out); sel.removeAllRanges(); sel.addRange(rg);
        var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
        btn.textContent = ok ? "Copiado ✓" : "Texto selecionado: copie pelo menu";
        setTimeout(function () { btn.textContent = "Copiar registro"; }, 3000);
      };
      try { navigator.clipboard.writeText(t).then(done, fallback); } catch (e) { fallback(); }
    }
  });
  document.addEventListener("input", function (ev) {
    var log = ev.target.closest && ev.target.closest(".wo-log"); if (!log) return;
    if (ev.target.matches(".wo-kg,.wo-reps")) { collect(log); summary(log); }
  });

  window.__llTreinoHydrate();
  // Navegação do app sem recarregar a página: hidrata quando um treino novo aparece.
  new MutationObserver(function () { window.__llTreinoHydrate(); }).observe(document.body, { childList: true, subtree: true });
})();
