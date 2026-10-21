/* Arcelis Labs site script.
   To connect Tally forms later, paste the form links below. Until then the
   buttons fall back to email. */
var FORMS = {
  join: "",      // e.g. "https://tally.so/r/xxxxxx"  (student application / interest)
  propose: ""    // e.g. "https://tally.so/r/yyyyyy"  (project proposal)
};

(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function safePath(u) { return /^(https?:\/\/|assets\/)[^"'<>\s]+$/i.test(u || "") ? u : ""; }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  /* ---------- Toast + copy ---------- */
  var toastTimer;
  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }
  function selectText(el) {
    try {
      var r = document.createRange();
      r.selectNodeContents(el);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    } catch (e) { /* ignore */ }
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".copy") : null;
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var addr = btn.parentElement && btn.parentElement.querySelector(".addr");
    var done = function () { toast("Copied " + text); };
    var fail = function () { if (addr) selectText(addr); toast("Press Ctrl+C to copy"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else {
      fail();
    }
  });

  /* ---------- Calls to action ---------- */
  function wireCtas() {
    [["cta-join", FORMS.join], ["cta-propose", FORMS.propose]].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el && pair[1]) {
        el.href = pair[1];
        el.target = "_blank";
        el.rel = "noopener";
      }
    });
  }

  /* ---------- Hero tiles: the logo as a tile system ---------- */
  function tiles() {
    var canvas = document.getElementById("tiles");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var ink = cssVar("--ink", "#121417");
    var soft = cssVar("--tile-soft", "#E3E3DC");
    var red = cssVar("--accent", "#C8102E");
    var grid = [], cols = 0, rows = 0, cell = 0, dpr = 1, running = false, visible = true, timer = null, raf = 0;

    var seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    function build() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cols = Math.max(4, Math.round(w / (w > 560 ? 86 : 64)));
      cell = w / cols;
      rows = Math.max(3, Math.round(h / cell));
      cell = Math.min(cell, h / rows);
      seed = 7;
      grid = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = rand(), type;
          if (x < 0.5) type = "ink";
          else if (x < 0.74) type = "soft";
          else if (x < 0.93) type = "empty";
          else if (x < 0.97) type = "red";
          else type = "square";
          var q = Math.floor(rand() * 4);
          grid.push({ c: c, r: r, type: type, rot: q, target: q });
        }
      }
      return true;
    }

    function drawTile(t) {
      if (t.type === "empty") return;
      var x = t.c * cell, y = t.r * cell, half = cell / 2;
      ctx.save();
      ctx.translate((x + half) * dpr, (y + half) * dpr);
      ctx.rotate(t.rot * Math.PI / 2);
      ctx.scale(dpr, dpr);
      if (t.type === "square") {
        ctx.fillStyle = red;
        var s = cell * 0.26;
        ctx.fillRect(half - s - cell * 0.12, -half + cell * 0.12, s, s);
      } else {
        ctx.fillStyle = t.type === "ink" ? ink : (t.type === "red" ? red : soft);
        ctx.beginPath();
        ctx.moveTo(-half, half);
        ctx.arc(-half, half, cell, -Math.PI / 2, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cols * cell * dpr, rows * cell * dpr);
      ctx.clip();
      for (var i = 0; i < grid.length; i++) drawTile(grid[i]);
      ctx.restore();
    }

    function step() {
      raf = 0;
      var moving = false;
      for (var i = 0; i < grid.length; i++) {
        var t = grid[i], d = t.target - t.rot;
        if (Math.abs(d) > 0.002) { t.rot += d * 0.14; moving = true; } else { t.rot = t.target; }
      }
      draw();
      if (moving) raf = requestAnimationFrame(step);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    function turn(t) {
      if (!t || t.type === "empty") return;
      if (Math.abs(t.target - t.rot) > 0.3) return;
      t.target += 1;
      if (reduceMotion) { t.rot = t.target; draw(); } else { kick(); }
    }

    function tileAt(ev) {
      var rect = canvas.getBoundingClientRect();
      var c = Math.floor((ev.clientX - rect.left) / cell);
      var r = Math.floor((ev.clientY - rect.top) / cell);
      if (c < 0 || r < 0 || c >= cols || r >= rows) return null;
      return grid[r * cols + c];
    }

    function auto() {
      clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(function () {
        if (!visible || document.hidden) return;
        for (var k = 0; k < 2; k++) turn(grid[Math.floor(Math.random() * grid.length)]);
      }, 900);
    }

    function init() { if (build()) { draw(); auto(); } }

    var last = null;
    canvas.addEventListener("pointermove", function (ev) {
      if (ev.pointerType !== "mouse") return;
      var t = tileAt(ev);
      if (t && t !== last) { last = t; turn(t); }
    });
    canvas.addEventListener("pointerleave", function () { last = null; });
    canvas.addEventListener("click", function (ev) { turn(tileAt(ev)); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
    }
    if ("ResizeObserver" in window) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = canvas.clientWidth;
        if (Math.abs(w - lastW) > 2) { lastW = w; init(); }
      }).observe(canvas);
    } else {
      window.addEventListener("resize", init);
    }
    init();
    running = true;
  }

  /* ---------- Specimen ---------- */
  function specimen() {
    var line = document.getElementById("spec-line");
    var bytesBox = document.getElementById("spec-bytes");
    var bSub = document.getElementById("view-sub");
    var bByte = document.getElementById("view-byte");
    if (!line || !bytesBox || !bSub || !bByte) return;

    var toks = Array.prototype.slice.call(line.querySelectorAll(".tok"));
    var words = toks.map(function (t) { return t.querySelector(".tok-t").textContent; });
    var sentence = "";
    words.forEach(function (w, i) {
      var punct = /^[,।.]$/.test(w);
      var glued = w === "सन्धान"; // second half of अनुसन्धान
      sentence += (i === 0 || punct || glued ? "" : " ") + w;
    });
    var english = "Our language, our research.";

    if (window.TextEncoder) {
      var enc = new TextEncoder();
      var neB = enc.encode(sentence).length;
      var enB = enc.encode(english).length;
      document.getElementById("ne-bytes").textContent = neB;
      document.getElementById("en-bytes").textContent = enB;
      document.getElementById("ratio").textContent = (neB / enB).toFixed(1);
    }

    var split = false;
    function splitAll() {
      if (split) return;
      split = true;
      toks.forEach(function (t, i) {
        if (reduceMotion) t.classList.add("is-split");
        else setTimeout(function () { t.classList.add("is-split"); }, i * 160);
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { splitAll(); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(line);
    } else {
      splitAll();
    }

    function renderBytes() {
      if (bytesBox.childElementCount) return;
      var frag = document.createDocumentFragment();
      var bytes = window.TextEncoder ? new TextEncoder().encode(sentence) : [];
      for (var i = 0; i < bytes.length; i++) {
        var b = bytes[i];
        var s = document.createElement("span");
        s.className = "byte" + (b < 0x80 ? " ascii" : (b >= 0xC0 ? " lead" : ""));
        s.textContent = (b < 16 ? "0" : "") + b.toString(16).toUpperCase();
        if (!reduceMotion) s.style.animationDelay = Math.min(i * 12, 900) + "ms";
        frag.appendChild(s);
      }
      bytesBox.appendChild(frag);
      bytesBox.setAttribute("aria-label", bytes.length + " bytes of UTF-8. Highlighted cells start a new character.");
    }
    function setView(byteView) {
      bSub.classList.toggle("is-on", !byteView);
      bByte.classList.toggle("is-on", byteView);
      bSub.setAttribute("aria-pressed", String(!byteView));
      bByte.setAttribute("aria-pressed", String(byteView));
      if (byteView) renderBytes();
      line.hidden = byteView;
      bytesBox.hidden = !byteView;
    }
    bSub.addEventListener("click", function () { setView(false); });
    bByte.addEventListener("click", function () { setView(true); });
  }

  /* ---------- Projects ---------- */
  var STATUS = ["open", "active", "completed"];
  var LABEL = { open: "Open", active: "Active", completed: "Completed" };
  var EMPTY = {
    open: ["No open projects right now.", "New projects open twice a year. You can still propose one."],
    active: ["No active projects yet.", "Teams start after each intake closes."],
    completed: ["No completed projects yet.", "Finished projects will appear here with their papers, code and data."]
  };
  var projects = [];
  var current = "open";

  function factsHtml(p, extra) {
    var rows = [
      ["Mentor", (p.mentors || []).join(", ")],
      ["Time", p.commitment],
      ["Duration", p.duration]
    ];
    if (extra) {
      rows.push(["Team", p.team]);
      rows.push(["Opened", p.opened]);
      rows.push(["Area", p.area]);
    }
    return '<dl class="facts">' + rows.filter(function (r) { return r[1]; }).map(function (r) {
      return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("") + "</dl>";
  }
  function chipHtml(p) {
    var s = STATUS.indexOf(p.status) >= 0 ? p.status : "open";
    var h = '<span class="chips"><span class="chip chip-' + s + '">' + LABEL[s] + "</span>";
    if (p.draft) h += '<span class="chip chip-draft" title="Details may change">Draft</span>';
    return h + "</span>";
  }
  function renderList() {
    var list = document.getElementById("project-list");
    var items = projects.filter(function (p) { return p.status === current; });
    if (!items.length) {
      var e = EMPTY[current];
      list.innerHTML = '<div class="empty"><strong>' + esc(e[0]) + "</strong><span>" + esc(e[1]) + "</span></div>";
      return;
    }
    list.innerHTML = items.map(function (p) {
      var action = p.status === "open" ? "Details and apply" : (p.status === "completed" ? "Results" : "Details");
      return '<article class="project">' +
        '<div class="project-top"><span class="area-tag">' + esc(p.area) + "</span>" + chipHtml(p) + "</div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        '<p class="project-sum">' + esc(p.summary) + "</p>" +
        factsHtml(p, false) +
        '<div class="project-actions"><button type="button" class="link-btn" data-open="' + esc(p.id) + '" aria-label="' + esc(action + ": " + p.title) + '">' + esc(action) + "</button></div>" +
        "</article>";
    }).join("");
  }
  function setTab(status, focus) {
    current = status;
    STATUS.forEach(function (s) {
      var t = document.getElementById("tab-" + s);
      var on = s === status;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    document.getElementById("project-list").setAttribute("aria-labelledby", "tab-" + status);
    renderList();
  }
  function wireTabs() {
    var tabs = STATUS.map(function (s) { return document.getElementById("tab-" + s); });
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { setTab(t.getAttribute("data-status"), false); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") n = 0;
        if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); setTab(tabs[n].getAttribute("data-status"), true); }
      });
    });
  }
  function applyHtml(p) {
    var copyBtn = '<button type="button" class="copy" data-copy="join@arcelis.org" aria-label="Copy email address join@arcelis.org">Copy</button>';
    if (p.status === "active") {
      return '<div class="apply-box"><p>This project is underway. Want to contribute? Write to us and name the project.</p>' +
        '<p class="contact-line"><span class="addr">join@arcelis.org</span> ' + copyBtn + "</p></div>";
    }
    if (p.status !== "open") return "";
    if (FORMS.join) {
      var url = FORMS.join + (FORMS.join.indexOf("?") >= 0 ? "&" : "?") + "project=" + encodeURIComponent(p.id);
      return '<div class="apply-box"><p class="modal-h">Apply</p><p>Fill in the short application form. Every applicant gets a reply within 14 days.</p>' +
        '<a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Apply to this project</a></div>';
    }
    var subject = "Application: " + p.title;
    return '<div class="apply-box"><p class="modal-h">Apply</p>' +
      "<p>Email us with the subject <strong>“" + esc(subject) + "”</strong>. Include a few lines about yourself, something you have built, and your CV or GitHub. Every applicant gets a reply within 14 days.</p>" +
      '<p class="contact-line"><span class="addr">join@arcelis.org</span> ' + copyBtn + "</p>" +
      '<a class="btn btn-primary" href="mailto:join@arcelis.org?subject=' + encodeURIComponent(subject) + '">Write the email</a></div>';
  }

  var modal, lastFocus;
  function openProject(id) {
    var p = projects.filter(function (x) { return x.id === id; })[0];
    if (!p || !modal) return;
    var links = (p.links || []).filter(function (l) { return l && safeUrl(l.url); }).map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>";
    }).join(" · ");
    function tags(arr) { return '<div class="tags">' + arr.map(function (s) { return '<span class="tag">' + esc(s) + "</span>"; }).join("") + "</div>"; }
    document.getElementById("modal-content").innerHTML =
      '<div class="project-top"><span class="area-tag">' + esc(p.area) + "</span>" + chipHtml(p) + "</div>" +
      '<h2 id="modal-title">' + esc(p.title) + "</h2>" +
      (p.question ? '<p class="modal-q">' + esc(p.question) + "</p>" : "") +
      '<p class="modal-sum">' + esc(p.summary) + "</p>" +
      factsHtml(p, true) +
      ((p.skills || []).length ? '<p class="modal-h">Skills that help</p>' + tags(p.skills) : "") +
      ((p.outputs || []).length ? '<p class="modal-h">Expected outputs</p>' + tags(p.outputs) : "") +
      (links ? '<p class="modal-h">Links</p><p>' + links + "</p>" : "") +
      applyHtml(p);
    lastFocus = document.activeElement;
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
    var c = document.getElementById("modal-close");
    if (c) c.focus();
  }
  function closeModal() {
    if (!modal) return;
    if (typeof modal.close === "function") { modal.close(); }
    else { modal.removeAttribute("open"); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  }
  function wireModal() {
    modal = document.getElementById("project-modal");
    if (!modal) return;
    document.getElementById("modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    modal.addEventListener("close", function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    document.getElementById("project-list").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-open]") : null;
      if (b) openProject(b.getAttribute("data-open"));
    });
  }
  function loadProjects() {
    var list = document.getElementById("project-list");
    var tabs = document.getElementById("tabs");
    var call = document.getElementById("call");
    fetch("data/projects.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        projects = ((data && data.projects) || []).filter(function (p) { return p && p.id && p.title; });
        if (!projects.length) return; // keep the "first call for projects" panel
        STATUS.forEach(function (s) {
          document.getElementById("count-" + s).textContent =
            projects.filter(function (p) { return p.status === s; }).length;
        });
        tabs.hidden = false;
        list.hidden = false;
        call.hidden = true;
        var first = STATUS.filter(function (s) { return projects.some(function (p) { return p.status === s; }); })[0] || "open";
        setTab(first, false);
      })
      .catch(function () { /* keep the call panel; it already explains how to get involved */ });
  }

  /* ---------- People ---------- */
  function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
  }
  function personHtml(p) {
    var photo = safePath(p.photo);
    var pic = photo
      ? '<img class="photo" src="' + esc(photo) + '" alt="' + esc(p.name) + '" width="96" height="96" loading="lazy">'
      : '<div class="avatar" aria-hidden="true">' + esc(initials(p.name)) + "</div>";
    var links = (p.links || []).filter(function (l) { return l && safeUrl(l.url); }).map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>";
    }).join("");
    return '<article class="person">' + pic +
      '<div class="person-body"><h3>' + esc(p.name) + "</h3>" +
      (p.role ? '<p class="role">' + esc(p.role) + "</p>" : "") +
      (p.affiliation ? '<p class="affil">' + esc(p.affiliation) + "</p>" : "") +
      ((p.research || []).length ? '<ul class="research-tags" aria-label="Research interests">' + p.research.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" : "") +
      ((p.points || []).length ? '<ul class="points">' + p.points.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      (p.bio ? '<p class="bio">' + esc(p.bio) + "</p>" : "") +
      (links ? '<p class="person-links">' + links + "</p>" : "") +
      "</div></article>";
  }
  function inviteHtml(text) {
    return '<article class="person person-open"><div class="avatar avatar-open" aria-hidden="true">+</div>' +
      '<div class="person-body"><h3>Mentor a project</h3><p class="bio">' + esc(text) + '</p>' +
      '<p class="person-links"><a href="#join-faculty">Propose a project</a></p></div></article>';
  }
  function loadPeople() {
    var box = document.getElementById("people-groups");
    if (!box) return;
    fetch("data/people.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var groups = (data && data.groups) || [];
        var people = (data && data.people) || [];
        var html = groups.map(function (g) {
          var members = people.filter(function (p) { return p && p.name && p.group === g.id; });
          if (!members.length && !g.invite) return "";
          var cards = members.map(personHtml).join("") + (g.invite && !members.length ? inviteHtml(g.invite) : "");
          return '<div class="people-group"><h3 class="group-h">' + esc(g.label) + '</h3><div class="people">' + cards + "</div></div>";
        }).join("");
        box.innerHTML = html || '<p class="empty">People will be listed here soon.</p>';
      })
      .catch(function () {
        box.innerHTML = '<p class="empty">People could not be loaded. Refresh the page to try again.</p>';
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    wireCtas();
    tiles();
    specimen();
    wireTabs();
    wireModal();
    loadProjects();
    loadPeople();
  });
})();
