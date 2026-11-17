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
    applyAll(log);
  }
  function save(log) {
    var st = {};
    log.querySelectorAll('.wo-set[aria-pressed="true"]').forEach(function (b) { st[setId(b)] = true; });
    put(log.dataset.key, JSON.stringify(st));
  }


  // ---- Trocar exercício (base de equivalência) ----
  // Os substitutos vêm do próprio HTML (script.wo-swapdata). A escolha fica só neste aparelho, por treino e por dia.
  var EQ = { alta: "alta", media: "média", baixa: "baixa" };
  var EQUIP = { maquina: "Máquina", cabo: "Cabo", halter: "Halter", barra: "Barra", smith: "Smith", "peso-corporal": "Peso corporal", banco: "Banco", step: "Step", elastico: "Elástico", kettlebell: "Kettlebell", "leg-press": "Leg press" };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function swapData(log) {
    if (log.__sd) return log.__sd;
    try { log.__sd = JSON.parse(log.querySelector("script.wo-swapdata").textContent) || {}; } catch (e) { log.__sd = {}; }
    return log.__sd;
  }
  function swapKey(log) { return log.dataset.key + ":trocas"; }
  function swaps(log) { try { return JSON.parse(get(swapKey(log)) || "{}") || {}; } catch (e) { return {}; } }
  function saveSwaps(log, st) { put(swapKey(log), JSON.stringify(st)); }
  function findAlt(log, ex, ref) {
    var g = (swapData(log)[ex] || [])[ref.g]; if (!g) return null;
    for (var i = 0; i < g.alternativas.length; i++) if (g.alternativas[i].id === ref.id) return { group: g, alt: g.alternativas[i] };
    return null;
  }
  function snapshot(card) {
    if (card.__orig) return card.__orig;
    var f = card.querySelector("svg.fig"), t = card.querySelector(".wo-tips"), v = card.querySelector(".wo-var"), c = card.querySelector(".wo-focus");
    var sr = card.querySelector(".wo-sr");
    card.__orig = {
      sr: sr ? sr.textContent : null, sets: card.querySelectorAll(".wo-set").length,
      name: card.dataset.name, h2: card.querySelector("h2").textContent, focus: c ? c.textContent : null,
      fig: f ? { vb: f.getAttribute("viewBox"), label: f.getAttribute("aria-label"), html: f.innerHTML } : null,
      tips: t ? t.innerHTML : null, vari: v ? v.innerHTML : null
    };
    return card.__orig;
  }
  function ensure(card, sel, make, after) {
    var e = card.querySelector(sel); if (e) return e;
    e = make(); var ref = card.querySelector(after); if (ref) ref.insertAdjacentElement("afterend", e); else card.appendChild(e); return e;
  }
  // Séries: ajusta o número de botões (as marcas já feitas continuam valendo, até o novo total).
  function setCount(card, n) {
    var box = card.querySelector(".wo-sets"); if (!box) return;
    var btns = box.querySelectorAll(".wo-set");
    while (btns.length > n) { btns[btns.length - 1].remove(); btns = box.querySelectorAll(".wo-set"); }
    while (btns.length < n && btns.length) {
      var c = btns[btns.length - 1].cloneNode(true), k = btns.length + 1;
      c.dataset.set = String(k); c.textContent = String(k); c.setAttribute("aria-pressed", "false"); c.setAttribute("aria-label", "Série " + k + " feita");
      box.appendChild(c); btns = box.querySelectorAll(".wo-set");
    }
  }
  function applySwap(card, found) {
    var o = snapshot(card), box = card.querySelector(".wo-swapped"), btn = card.querySelector(".wo-swap");
    var f = card.querySelector("svg.fig"), t = card.querySelector(".wo-tips"), v = card.querySelector(".wo-var"), c = card.querySelector(".wo-focus"), k = card.querySelector(".wo-chip.k");
    var sr = card.querySelector(".wo-sr");
    if (k) k.hidden = !!found; // a carga do plano não vale para o exercício trocado
    if (!found) {
      if (sr && o.sr != null) sr.textContent = o.sr; setCount(card, o.sets);
      card.dataset.name = o.name; card.querySelector("h2").textContent = o.h2;
      if (c && o.focus != null) c.textContent = o.focus;
      if (f && o.fig) { f.setAttribute("viewBox", o.fig.vb); f.setAttribute("aria-label", o.fig.label); f.innerHTML = o.fig.html; f.hidden = false; }
      if (t) { if (o.tips != null) t.innerHTML = o.tips; t.hidden = o.tips == null; }
      if (v) { if (o.vari != null) v.innerHTML = o.vari; v.hidden = o.vari == null; }
      box.hidden = true; box.textContent = ""; if (btn) btn.textContent = "Trocar";
      return;
    }
    var a = found.alt;
    if (sr && a.series && a.reps) sr.textContent = a.series + " × " + a.reps;
    if (a.series) setCount(card, a.series);
    card.dataset.name = a.nome; card.querySelector("h2").textContent = a.nome;
    if (c && a.foco) c.textContent = a.foco;
    if (a.figure) {
      if (!f) f = ensure(card, "svg.fig", function () { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("class", "fig"); s.setAttribute("role", "img"); return s; }, ".wo-swapped");
      f.setAttribute("viewBox", a.figure.viewBox); f.setAttribute("aria-label", a.figure.label); f.innerHTML = a.figure.body; f.hidden = false;
    } else if (f) f.hidden = true;
    if (a.dicas && a.dicas.length) {
      if (!t) t = ensure(card, ".wo-tips", function () { return el("ul", "wo-tips"); }, "svg.fig");
      t.textContent = ""; a.dicas.forEach(function (d) { t.appendChild(el("li", null, d)); }); t.hidden = false;
    } else if (t) t.hidden = true;
    if (!v) v = ensure(card, ".wo-var", function () { return el("div", "wo-var"); }, ".wo-tips");
    v.textContent = "";
    function line(k, txt) { if (!txt) return; var p = el("p"); p.appendChild(el("strong", null, k + " ")); p.appendChild(document.createTextNode(txt)); v.appendChild(p); }
    line("Ajuste:", a.ajuste); line("Atenção:", a.atencao);
    v.hidden = !v.firstChild;
    box.hidden = false; box.textContent = "";
    box.appendChild(el("span", null, "Trocado, o original era " + o.h2 + "."));
    var u = el("button", "wo-undo", "Voltar ao original"); u.type = "button"; box.appendChild(u);
    if (btn) btn.textContent = "Trocar de novo";
  }
  function applyAll(log) {
    var st = swaps(log);
    log.querySelectorAll(".wo-card").forEach(function (card) {
      var ref = st[card.dataset.ex]; if (!ref) return;
      var found = findAlt(log, card.dataset.ex, ref);
      if (found) applySwap(card, found);
    });
  }
  var sheet = null;
  function closeSheet() { if (sheet && sheet.open) sheet.close(); }
  function openSheet(log, card) {
    var ex = card.dataset.ex, groups = swapData(log)[ex] || []; if (!groups.length) return;
    if (!sheet) {
      sheet = el("dialog", "wo-sheet");
      sheet.addEventListener("click", function (ev) { if (ev.target === sheet) closeSheet(); });
      document.body.appendChild(sheet);
    }
    sheet.textContent = "";
    var st = swaps(log), cur = st[ex];
    var head = el("div", "wo-sheet-h"); head.appendChild(el("h2", null, "Trocar exercício"));
    var x = el("button", "wo-btn", "Fechar"); x.type = "button"; x.addEventListener("click", closeSheet); head.appendChild(x); sheet.appendChild(head);
    sheet.appendChild(el("p", "wo-sheet-sub", "Do mais parecido ao menos parecido. A carga não passa de um aparelho para outro: refaça pela reserva, usando a primeira série como teste."));
    if (cur) {
      var back = el("button", "wo-alt wo-alt-orig", "Usar o exercício do plano"); back.type = "button";
      back.addEventListener("click", function () { var s2 = swaps(log); delete s2[ex]; saveSwaps(log, s2); applySwap(card, null); closeSheet(); });
      sheet.appendChild(back);
    }
    groups.forEach(function (g, gi) {
      var sec = el("section", "wo-sheet-g");
      if (groups.length > 1) sec.appendChild(el("h3", null, g.original));
      if (g.criterios) sec.appendChild(el("p", "wo-sheet-crit", "A troca precisa manter: " + g.criterios));
      g.alternativas.forEach(function (a, i) {
        var b = el("button", "wo-alt"); b.type = "button";
        if (cur && cur.g === gi && cur.id === a.id) b.setAttribute("aria-current", "true");
        var top = el("div", "wo-alt-top");
        top.appendChild(el("span", "wo-alt-n", String(i + 1)));
        top.appendChild(el("span", "wo-alt-name", a.nome));
        top.appendChild(el("span", "wo-pill " + a.equivalencia, EQ[a.equivalencia] || a.equivalencia));
        b.appendChild(top);
        var tg = el("div", "wo-alt-tags");
        (a.equipamento || []).forEach(function (q) { tg.appendChild(el("span", "wo-tag", EQUIP[q] || q)); });
        b.appendChild(tg);
        function row(k, txt) { if (!txt) return; var p = el("p", "wo-alt-row"); p.appendChild(el("strong", null, k + " ")); p.appendChild(document.createTextNode(txt)); b.appendChild(p); }
        row("Séries:", a.series + " × " + a.reps); row("Quando:", a.quando); row("Ajuste:", a.ajuste); row("Atenção:", a.atencao);
        b.addEventListener("click", function () {
          var s2 = swaps(log); s2[ex] = { g: gi, id: a.id }; saveSwaps(log, s2);
          applySwap(card, { group: g, alt: a }); closeSheet();
          var h = card.getBoundingClientRect(); if (h.top < 0) card.scrollIntoView({ block: "start" });
        });
        sec.appendChild(b);
      });
      if (g.evitar && g.evitar.length) {
        var d = el("details", "wo-avoid"); d.appendChild(el("summary", null, "Evitar neste treino"));
        g.evitar.forEach(function (v) { var p = el("p"); p.appendChild(el("strong", null, v.nome + ": ")); p.appendChild(document.createTextNode(v.porque)); d.appendChild(p); });
        sec.appendChild(d);
      }
      sheet.appendChild(sec);
    });
    if (sheet.showModal) sheet.showModal(); else sheet.setAttribute("open", "");
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
    var sw = ev.target.closest(".wo-swap");
    if (sw) { openSheet(log, sw.closest(".wo-card")); return; }
    var un = ev.target.closest(".wo-undo");
    if (un) {
      var cd = un.closest(".wo-card"), s3 = swaps(log); delete s3[cd.dataset.ex]; saveSwaps(log, s3); applySwap(cd, null); return;
    }
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
