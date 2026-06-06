/* =============================================================================
   Overhead — Ceiling Mode (ceiling.html)
   A cinematic planetarium sky-dome made to be projected onto a ceiling.
   Deep space: Milky Way, nebulae, layered twinkling stars, a slowly wheeling
   sky, shooting stars, an atmospheric horizon glow — and the ISS as a glowing
   comet tracing its arc across YOUR sky.
   ============================================================================= */
(function () {
  "use strict";
  var D2R = Math.PI / 180, TAU = Math.PI * 2;
  var $ = function (s) { return document.querySelector(s); };

  var observer = (function () {
    try { return JSON.parse(localStorage.getItem("overhead_loc_v1") || "null"); } catch (e) { return null; }
  })() || { latDeg: 51.4779, lonDeg: -0.0015, altKm: 0, label: "Greenwich (default)" };

  var FLIP_KEY = "overhead_flip_v1";
  var flip = localStorage.getItem(FLIP_KEY) === "1";   // looking-up (mirror E/W) vs map view

  var satrec = null, passes = [], trail = [], lastPassCalc = 0, meteors = [];
  var canvas, ctx, dpr = 1, size, cx, cy, R;
  var cosmic, cosmicSize, twinkle = [];

  /* tiny seeded RNG so the sky looks identical between frames/resizes */
  function mulberry(seed) { return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }; }

  var STAR_TINTS = ["#ffffff", "#dce8ff", "#bcd0ff", "#fff0d6", "#ffd9b0", "#e8d6ff"];

  /* ----------------------------------------------------- sizing */
  function resize() {
    size = Math.min(window.innerWidth, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = size / 2; cy = size / 2; R = size * 0.46;
    buildCosmic();
  }

  /* ----------------------------------------------------- build the deep-space backdrop
     Rendered once to an oversized offscreen canvas so the whole sky can wheel
     slowly without exposing empty corners. */
  function buildCosmic() {
    cosmicSize = Math.ceil(size * 1.55);
    cosmic = document.createElement("canvas");
    cosmic.width = cosmicSize * dpr; cosmic.height = cosmicSize * dpr;
    var c = cosmic.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var S = cosmicSize, m = S / 2, rnd = mulberry(20260606);

    // base deep-space gradient
    var bg = c.createRadialGradient(m, m, 0, m, m, m);
    bg.addColorStop(0, "#0a1430"); bg.addColorStop(.45, "#060c20");
    bg.addColorStop(1, "#01030a");
    c.fillStyle = bg; c.fillRect(0, 0, S, S);

    // nebula clouds — large, very soft, low-alpha colour blobs
    var nebula = [
      ["#5b3cff", .10], ["#1f8fff", .08], ["#ff4f8b", .07],
      ["#16d6c4", .07], ["#8a4dff", .09],
    ];
    nebula.forEach(function (n) {
      var x = rnd() * S, y = rnd() * S, rad = S * (0.22 + rnd() * 0.28);
      var g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, hexA(n[0], n[1]));
      g.addColorStop(.6, hexA(n[0], n[1] * 0.35));
      g.addColorStop(1, hexA(n[0], 0));
      c.fillStyle = g; c.fillRect(0, 0, S, S);
    });

    // Milky Way band — soft diagonal glow + dense faint stars
    c.save();
    c.translate(m, m); c.rotate(-0.6); c.translate(-m, -m);
    for (var i = 0; i < 26; i++) {
      var bx = (i / 25) * S, by = m + (rnd() - .5) * S * 0.16;
      var br = S * (0.10 + rnd() * 0.10);
      var g2 = c.createRadialGradient(bx, by, 0, bx, by, br);
      var tint = rnd() < .5 ? "#aab8ff" : "#d8c6ff";
      g2.addColorStop(0, hexA(tint, 0.05)); g2.addColorStop(1, hexA(tint, 0));
      c.fillStyle = g2; c.fillRect(0, 0, S, S);
    }
    for (var s = 0; s < S * 1.4; s++) {           // dense haze stars along the band
      var hx = rnd() * S, hy = m + gaussian(rnd, rnd) * S * 0.085;
      c.globalAlpha = 0.25 + rnd() * 0.4;
      c.fillStyle = STAR_TINTS[(rnd() * STAR_TINTS.length) | 0];
      c.fillRect(hx, hy, rnd() < .85 ? 1 : 1.4, 1);
    }
    c.globalAlpha = 1; c.restore();

    // field stars across the whole sky
    var n = Math.round(S * 1.5);
    for (var k = 0; k < n; k++) {
      var x = rnd() * S, y = rnd() * S;
      var mag = Math.pow(rnd(), 2.4);            // many faint, few bright
      var rad = 0.4 + mag * 1.9;
      var tint = STAR_TINTS[(rnd() * STAR_TINTS.length) | 0];
      if (mag > 0.55) {                          // brighter stars get a soft halo
        var gg = c.createRadialGradient(x, y, 0, x, y, rad * 4);
        gg.addColorStop(0, hexA(tint, 0.5)); gg.addColorStop(1, hexA(tint, 0));
        c.fillStyle = gg; c.beginPath(); c.arc(x, y, rad * 4, 0, TAU); c.fill();
      }
      c.globalAlpha = 0.5 + mag * 0.5;
      c.fillStyle = tint; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;

    // a handful of hero stars with diffraction spikes
    for (var h = 0; h < 9; h++) {
      var hx2 = rnd() * S, hy2 = rnd() * S;
      var tint2 = rnd() < .5 ? "#ffffff" : STAR_TINTS[(rnd() * STAR_TINTS.length) | 0];
      spikeStar(c, hx2, hy2, 3 + rnd() * 3, 16 + rnd() * 26, tint2);
    }

    // twinkle stars (drawn live each frame) — store in centre-relative coords
    twinkle = [];
    var tn = 46;
    for (var t = 0; t < tn; t++) {
      var a = rnd() * TAU, rr = Math.sqrt(rnd()) * (m * 0.95);
      twinkle.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr,
        s: 0.8 + rnd() * 1.6, ph: rnd() * TAU, sp: 0.5 + rnd(),
        tint: rnd() < .6 ? "#ffffff" : STAR_TINTS[(rnd() * STAR_TINTS.length) | 0] });
    }
  }

  /* ----------------------------------------------------- small drawing helpers */
  function hexA(hex, a) {
    var h = hex.replace("#", "");
    var r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  function gaussian(r1, r2) { return Math.sqrt(-2 * Math.log(r1() + 1e-9)) * Math.cos(TAU * r2()); }
  function spikeStar(c, x, y, core, len, tint) {
    var g = c.createRadialGradient(x, y, 0, x, y, core * 3);
    g.addColorStop(0, hexA(tint, 1)); g.addColorStop(.4, hexA(tint, .5)); g.addColorStop(1, hexA(tint, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, core * 3, 0, TAU); c.fill();
    c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = hexA(tint, .55); c.lineWidth = 1;
    [[len, 0], [0, len], [-len, 0], [0, -len]].forEach(function (d, i) {
      var lg = c.createLinearGradient(x, y, x + d[0], y + d[1]);
      lg.addColorStop(0, hexA(tint, .8)); lg.addColorStop(1, hexA(tint, 0));
      c.strokeStyle = lg; c.beginPath(); c.moveTo(x, y); c.lineTo(x + d[0], y + d[1]); c.stroke();
    });
    c.restore();
  }

  /* ----------------------------------------------------- sky <-> screen */
  function project(az, el) {
    var r = (90 - el) / 90 * R, a = az * D2R, dx = Math.sin(a) * r;
    if (flip) dx = -dx;
    return { x: cx + dx, y: cy - Math.cos(a) * r };
  }
  function ringPoint(az, rad) {
    var a = az * D2R, dx = Math.sin(a); if (flip) dx = -dx;
    return { x: cx + dx * rad, y: cy - Math.cos(a) * rad };
  }

  /* ----------------------------------------------------- dome guides */
  function drawGuides() {
    // atmospheric horizon glow
    var hg = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.04);
    hg.addColorStop(0, "rgba(90,208,255,0)");
    hg.addColorStop(.85, "rgba(90,208,255,.05)");
    hg.addColorStop(1, "rgba(130,190,255,.20)");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, TAU); ctx.fill();

    // elevation rings
    ctx.strokeStyle = "rgba(150,185,235,.13)"; ctx.lineWidth = 1;
    [30, 60].forEach(function (el) { ring((90 - el) / 90 * R); });

    // horizon ring
    ctx.strokeStyle = "rgba(120,200,255,.45)"; ctx.lineWidth = 1.5; ring(R);

    // degree ticks
    ctx.strokeStyle = "rgba(150,190,240,.35)";
    for (var a = 0; a < 360; a += 10) {
      var major = a % 90 === 0, mid = a % 30 === 0;
      var p1 = ringPoint(a, R), p2 = ringPoint(a, R - (major ? 14 : mid ? 9 : 5));
      ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }

    // zenith mark
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();

    // compass labels
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach(function (d) {
      var p = ringPoint(d[1], R + size * 0.045);
      ctx.fillStyle = "rgba(220,235,255,.92)";
      ctx.font = "650 " + Math.round(size * 0.028) + "px -apple-system,system-ui,sans-serif";
      ctx.fillText(d[0], p.x, p.y);
    });
    [["NE", 45], ["SE", 135], ["SW", 225], ["NW", 315]].forEach(function (d) {
      var p = ringPoint(d[1], R + size * 0.04);
      ctx.fillStyle = "rgba(160,185,225,.5)";
      ctx.font = "500 " + Math.round(size * 0.018) + "px -apple-system,system-ui,sans-serif";
      ctx.fillText(d[0], p.x, p.y);
    });
  }
  function ring(r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }

  /* ----------------------------------------------------- pass arc */
  function drawArc(pass, active) {
    if (!pass) return;
    var pts = [], nn = 80;
    for (var i = 0; i <= nn; i++) {
      var t = pass.start.getTime() + (pass.end - pass.start) * (i / nn);
      var st = ISS.stateAt(satrec, observer, new Date(t));
      if (!st || st.elDeg < 0) continue;
      pts.push(project(st.azDeg, st.elDeg));
    }
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (active) {
      ctx.shadowColor = "rgba(90,208,255,.7)"; ctx.shadowBlur = 12;
      ctx.strokeStyle = "rgba(120,215,255,.65)"; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "rgba(150,190,240,.32)"; ctx.lineWidth = 1.4; ctx.setLineDash([3, 7]);
    }
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();
    ctx.restore();

    // rise / set endpoint dots
    endpoint(pts[0], "rise"); endpoint(pts[pts.length - 1], "set", active);
  }
  function endpoint(p, kind, active) {
    ctx.fillStyle = active ? "rgba(120,215,255,.8)" : "rgba(150,190,240,.5)";
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
  }

  /* ----------------------------------------------------- the ISS comet */
  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (var i = 1; i < trail.length; i++) {
      var f = i / trail.length;
      ctx.strokeStyle = hexA(trail[i].lit ? "#ffe2a6" : "#5ad0ff", 0.05 + f * 0.6);
      ctx.lineWidth = 0.6 + f * 3.4;
      ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawISS(st, ts) {
    var p = project(st.azDeg, st.elDeg);
    var warm = st.visibleNow;
    var coreCol = warm ? "#fff7e8" : "#ffffff";
    var haloCol = warm ? "#ffcf7a" : "#5ad0ff";
    var pulse = 1 + 0.15 * Math.sin(ts / 280);

    ctx.save(); ctx.globalCompositeOperation = "lighter";
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40 * pulse);
    g.addColorStop(0, hexA(coreCol, .95));
    g.addColorStop(.22, hexA(haloCol, .75));
    g.addColorStop(1, hexA(haloCol, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 40 * pulse, 0, TAU); ctx.fill();
    // diffraction spikes
    var len = 26 * pulse;
    [[len, 0], [0, len], [-len, 0], [0, -len], [len * .6, len * .6], [-len * .6, len * .6], [len * .6, -len * .6], [-len * .6, -len * .6]].forEach(function (d) {
      var lg = ctx.createLinearGradient(p.x, p.y, p.x + d[0], p.y + d[1]);
      lg.addColorStop(0, hexA(coreCol, .8)); lg.addColorStop(1, hexA(haloCol, 0));
      ctx.strokeStyle = lg; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + d[0], p.y + d[1]); ctx.stroke();
    });
    ctx.restore();

    ctx.fillStyle = coreCol; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, TAU); ctx.fill();
  }

  /* ----------------------------------------------------- shooting stars */
  function spawnMeteor() {
    var edge = Math.random() * TAU, r0 = R * (0.4 + Math.random() * 0.7);
    var x = cx + Math.cos(edge) * r0, y = cy + Math.sin(edge) * r0;
    var dir = edge + Math.PI + (Math.random() - .5);
    var sp = size * (0.012 + Math.random() * 0.01);
    meteors.push({ x: x, y: y, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, life: 1 });
  }
  function drawMeteors() {
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= 0.022;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      var tx = m.x - m.vx * 9, ty = m.y - m.vy * 9;
      var lg = ctx.createLinearGradient(tx, ty, m.x, m.y);
      lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, hexA("#ffffff", m.life));
      ctx.strokeStyle = lg; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y); ctx.stroke();
    }
    if (Math.random() < 0.004) spawnMeteor();   // ~ one every several seconds
  }

  /* ----------------------------------------------------- HUD */
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
    ctx.clearRect(0, 0, size, size);

    // wheeling deep-space backdrop (one slow revolution ~ 30 min)
    var ang = (ts / 1000) * (TAU / 1800);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.drawImage(cosmic, -cosmicSize / 2, -cosmicSize / 2, cosmicSize, cosmicSize);
    // live twinkle stars share the rotation
    for (var i = 0; i < twinkle.length; i++) {
      var st = twinkle[i], tw = 0.45 + 0.55 * Math.pow(Math.max(0, Math.sin(ts / 1000 * st.sp + st.ph)), 2);
      ctx.globalAlpha = tw;
      ctx.fillStyle = st.tint;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.s, 0, TAU); ctx.fill();
      if (tw > 0.7) { ctx.globalAlpha = (tw - 0.7) * 1.2;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.s * 2.6, 0, TAU);
        ctx.fillStyle = hexA(st.tint, 0.4); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // cinematic vignette (view space)
    var vg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, size * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size);

    drawMeteors();
    drawGuides();

    if (satrec) {
      var now = new Date();
      if (Date.now() - lastPassCalc > 60000) {
        passes = ISS.predictPasses(satrec, observer, { hours: 24, stepSec: 20, minEl: 0 });
        lastPassCalc = Date.now();
      }
      var st2 = ISS.stateAt(satrec, observer, now);
      var activePass = passes.filter(function (p) { return now >= p.start && now <= p.end; })[0];
      var nextPass = passes.filter(function (p) { return p.start > now; })[0];

      drawArc(!activePass ? nextPass : null, false);
      drawArc(activePass, true);

      if (st2 && st2.elDeg > 0) {
        var pt = project(st2.azDeg, st2.elDeg);
        trail.push({ x: pt.x, y: pt.y, lit: st2.visibleNow }); if (trail.length > 48) trail.shift();
        drawTrail();
        drawISS(st2, ts);
        setHUD(st2.visibleNow ? "Visible overhead" : "Above the horizon",
          st2.elDeg.toFixed(0) + "°  ·  " + ISS.compass(st2.azDeg),
          Math.round(st2.rangeKm) + " km away" + (st2.visibleNow ? "  ·  look up — it's lit!" : ""));
      } else {
        if (trail.length) trail = [];
        if (nextPass) {
          setHUD("Next pass in", fmtCountdown(nextPass.start - now),
            "rises to the " + ISS.compass(nextPass.startAz) + "  ·  peaks " +
            nextPass.maxEl.toFixed(0) + "°" + (nextPass.visible ? "  ·  should be visible" : ""));
        } else { setHUD("Tracking", "—", "calculating next pass…"); }
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
    resize();
    window.addEventListener("resize", resize);

    $("#c-flip").addEventListener("click", function () {
      flip = !flip; localStorage.setItem(FLIP_KEY, flip ? "1" : "0");
      $("#c-flip").textContent = flip ? "View: Looking up" : "View: Map";
    });
    $("#c-flip").textContent = flip ? "View: Looking up" : "View: Map";
    $("#c-full").addEventListener("click", toggleFullscreen);
    $("#c-loc").textContent = "📍 " + (observer.label || "your location");

    keepAwake();

    ISS.ensureLib().then(function () { return ISS.fetchTLE(); })
      .then(function (tle) { satrec = ISS.makeSatrec(tle); requestAnimationFrame(frame); })
      .catch(function () {
        setHUD("Offline", "—", "Couldn't load orbit data. Check your connection.");
        requestAnimationFrame(frame);
      });
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
