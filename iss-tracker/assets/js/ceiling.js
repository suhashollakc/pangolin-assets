/* =============================================================================
   Overhead — Ceiling Mode (ceiling.html)
   A planetarium sky-dome made to be projected straight up onto a ceiling.
   Zenith = centre, horizon = outer ring. The ISS glows and traces its arc
   across YOUR sky; a big countdown shows when it next rises.
   ============================================================================= */
(function () {
  "use strict";
  var D2R = Math.PI / 180;
  var $ = function (s) { return document.querySelector(s); };

  var observer = (function () {
    try { return JSON.parse(localStorage.getItem("overhead_loc_v1") || "null"); } catch (e) { return null; }
  })() || { latDeg: 51.4779, lonDeg: -0.0015, altKm: 0, label: "Greenwich (default)" };

  var FLIP_KEY = "overhead_flip_v1";
  var flip = localStorage.getItem(FLIP_KEY) === "1"; // looking-up (mirror E/W) vs map view

  var satrec = null, passes = [], trail = [], lastPassCalc = 0;
  var canvas, ctx, stars = [], cx, cy, R, size;

  /* ----------------------------------------------------- sizing & stars */
  function resize() {
    size = Math.min(window.innerWidth, window.innerHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = size / 2; cy = size / 2; R = size * 0.46;
  }
  function makeStars() {
    stars = [];
    var n = Math.round(size * 0.5);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      stars.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr,
        s: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2 });
    }
  }

  /* ----------------------------------------------------- sky <-> screen */
  // azimuth (deg, from N clockwise) + elevation (deg) -> screen point
  function project(az, el) {
    var r = (90 - el) / 90 * R;
    var a = az * D2R;
    var dx = Math.sin(a) * r;
    if (flip) dx = -dx;                  // looking-up view mirrors East/West
    return { x: cx + dx, y: cy - Math.cos(a) * r };
  }

  /* ----------------------------------------------------- draw dome frame */
  function drawDome(t) {
    ctx.clearRect(0, 0, size, size);

    // faint sky glow toward zenith
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, "rgba(20,40,80,.35)"); g.addColorStop(1, "rgba(2,4,10,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // stars
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i], tw = 0.6 + 0.4 * Math.sin(t / 900 + st.tw);
      ctx.globalAlpha = tw; ctx.fillStyle = "#cfe0ff";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // elevation rings
    ctx.strokeStyle = "rgba(120,160,220,.16)"; ctx.lineWidth = 1;
    [30, 60].forEach(function (el) {
      var r = (90 - el) / 90 * R;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    });
    // horizon
    ctx.strokeStyle = "rgba(90,208,255,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // zenith mark
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    cross(cx, cy, 6);

    // compass labels
    ctx.fillStyle = "rgba(200,215,245,.7)"; ctx.font = "600 16px -apple-system,system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var dirs = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
    dirs.forEach(function (d) {
      var p = project(d[1], -5);
      ctx.fillText(d[0], p.x, p.y);
    });
  }
  function cross(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  }

  /* ----------------------------------------------------- draw a pass arc */
  function drawArc(pass, active) {
    if (!pass) return;
    ctx.beginPath();
    var n = 60, started = false;
    for (var i = 0; i <= n; i++) {
      var t = pass.start.getTime() + (pass.end - pass.start) * (i / n);
      var st = ISS.stateAt(satrec, observer, new Date(t));
      if (!st || st.elDeg < 0) continue;
      var p = project(st.azDeg, st.elDeg);
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = active ? "rgba(90,208,255,.5)" : "rgba(120,160,220,.28)";
    ctx.setLineDash(active ? [] : [4, 6]); ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.stroke(); ctx.setLineDash([]);
  }

  /* ----------------------------------------------------- draw the ISS */
  function drawISS(st, t) {
    // trail
    for (var i = 0; i < trail.length; i++) {
      var tr = trail[i], al = (i / trail.length) * 0.5;
      ctx.globalAlpha = al; ctx.fillStyle = "#5ad0ff";
      ctx.beginPath(); ctx.arc(tr.x, tr.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    var p = project(st.azDeg, st.elDeg);
    var pr = 9 + 2 * Math.sin(t / 300);
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 34);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(.25, st.visibleNow ? "rgba(255,210,120,.8)" : "rgba(90,208,255,.7)");
    g.addColorStop(1, "rgba(90,208,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, pr * 0.35 + 2, 0, Math.PI * 2); ctx.fill();
  }

  /* ----------------------------------------------------- HUD text */
  function fmtCountdown(ms) {
    if (ms < 0) ms = 0; var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return (h > 0 ? h + ":" : "") + p(m) + ":" + p(ss);
  }
  function setHUD(lab, big, sub) {
    $("#c-lab").textContent = lab; $("#c-big").textContent = big; $("#c-sub").textContent = sub || "";
  }

  /* ----------------------------------------------------- main loop */
  function frame(ts) {
    var now = new Date();
    drawDome(ts);

    if (satrec) {
      if (Date.now() - lastPassCalc > 60000) {
        passes = ISS.predictPasses(satrec, observer, { hours: 24, stepSec: 20, minEl: 0 });
        lastPassCalc = Date.now();
      }
      var st = ISS.stateAt(satrec, observer, now);
      var activePass = passes.filter(function (p) {
        return now >= p.start && now <= p.end;
      })[0];
      var nextPass = passes.filter(function (p) { return p.start > now; })[0];

      // arcs
      drawArc(nextPass && !activePass ? nextPass : null, false);
      drawArc(activePass, true);

      if (st && st.elDeg > 0) {
        var pt = project(st.azDeg, st.elDeg);
        trail.push(pt); if (trail.length > 40) trail.shift();
        drawISS(st, ts);
        setHUD(st.visibleNow ? "Visible overhead" : "Above the horizon",
          st.elDeg.toFixed(0) + "° · " + ISS.compass(st.azDeg),
          Math.round(st.rangeKm) + " km away" + (st.visibleNow ? " · look up, it's lit!" : ""));
      } else {
        trail = [];
        if (nextPass) {
          setHUD("Next pass in",
            fmtCountdown(nextPass.start - now),
            "rises to the " + ISS.compass(nextPass.startAz) + " · peaks " +
            nextPass.maxEl.toFixed(0) + "°" + (nextPass.visible ? " · should be visible" : ""));
        } else {
          setHUD("Tracking", "—", "calculating next pass…");
        }
      }
    }
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------- wake lock + fullscreen */
  var wakeLock = null;
  function keepAwake() {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(function (w) { wakeLock = w; }).catch(function () {});
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") keepAwake();
  });
  function toggleFullscreen() {
    if (!document.fullscreenElement) (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    else document.exitFullscreen && document.exitFullscreen();
  }

  /* ----------------------------------------------------- boot */
  function boot() {
    canvas = $("#dome"); ctx = canvas.getContext("2d");
    resize(); makeStars();
    window.addEventListener("resize", function () { resize(); makeStars(); });

    $("#c-flip").addEventListener("click", function () {
      flip = !flip; localStorage.setItem(FLIP_KEY, flip ? "1" : "0");
      $("#c-flip").textContent = flip ? "View: Looking up" : "View: Map";
    });
    $("#c-flip").textContent = flip ? "View: Looking up" : "View: Map";
    $("#c-full").addEventListener("click", toggleFullscreen);
    $("#c-loc").textContent = "📍 " + (observer.label || "your location");

    keepAwake();

    ISS.ensureLib().then(function () { return ISS.fetchTLE(); })
      .then(function (tle) {
        satrec = ISS.makeSatrec(tle);
        requestAnimationFrame(frame);
      })
      .catch(function () {
        setHUD("Offline", "—", "Couldn't load orbit data. Check your connection.");
        requestAnimationFrame(frame);
      });
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
