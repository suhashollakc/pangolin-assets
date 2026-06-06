/* =============================================================================
   Overhead — dashboard (index.html)
   Live world map, your-sky stats, upcoming passes, and pass alerts.
   ============================================================================= */
(function () {
  "use strict";
  var D2R = Math.PI / 180;
  var $ = function (s) { return document.querySelector(s); };

  /* ---------------------------------------------------------- location store */
  var LOC_KEY = "overhead_loc_v1";
  function loadLoc() {
    try { return JSON.parse(localStorage.getItem(LOC_KEY) || "null"); } catch (e) { return null; }
  }
  function saveLoc(o) { try { localStorage.setItem(LOC_KEY, JSON.stringify(o)); } catch (e) {} }

  var observer = loadLoc() || { latDeg: 51.4779, lonDeg: -0.0015, altKm: 0, label: "Greenwich (default)" };
  var satrec = null, passes = [], tleInfo = null;

  /* ---------------------------------------------------------- formatting */
  function fmtTime(d) { return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function fmtDay(d) {
    var t = new Date(), tm = new Date(t); tm.setDate(t.getDate() + 1);
    if (d.toDateString() === t.toDateString()) return "Today";
    if (d.toDateString() === tm.toDateString()) return "Tom";
    return d.toLocaleDateString([], { weekday: "short" });
  }
  function fmtDur(s) { var m = Math.floor(s / 60), ss = s % 60; return m + "m " + (ss < 10 ? "0" : "") + ss + "s"; }
  function fmtCountdown(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return (h > 0 ? h + ":" : "") + p(m) + ":" + p(ss);
  }

  /* ============================================================ MAP */
  var canvas, ctx, MW = 1024, MH = 512;
  function initMap() {
    canvas = $("#map");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MW * dpr; canvas.height = MH * dpr;
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
  }
  function x2(lon) { return (lon + 180) / 360 * MW; }
  function y2(lat) { return (90 - lat) / 180 * MH; }

  function drawMap(now) {
    ctx.clearRect(0, 0, MW, MH);
    // backdrop
    ctx.fillStyle = "#071226"; ctx.fillRect(0, 0, MW, MH);

    // day / night shading
    var ss = ISS.subsolar(now), phiS = ss.lat, lamS = ss.lon;
    ctx.fillStyle = "rgba(2,5,14,.55)";
    var step = 4;
    for (var px = 0; px < MW; px += step) {
      var lon = px / MW * 360 - 180;
      var topDark = isDark(89, lon, phiS, lamS);
      var tl = termLat(lon, phiS, lamS);
      var yb = y2(tl);
      if (topDark) ctx.fillRect(px, 0, step, yb);
      else ctx.fillRect(px, yb, step, MH - yb);
    }

    // graticule
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
    for (var lo = -150; lo <= 150; lo += 30) { line(x2(lo), 0, x2(lo), MH); }
    for (var la = -60; la <= 60; la += 30) { line(0, y2(la), MW, y2(la)); }
    ctx.strokeStyle = "rgba(90,208,255,.18)"; line(0, y2(0), MW, y2(0)); // equator

    if (!satrec) return;

    // ground track (~ one orbit centred on now)
    ctx.lineWidth = 2;
    var pts = [];
    for (var dt = -2700; dt <= 2700; dt += 30) {
      var st = ISS.stateAt(satrec, observer, new Date(now.getTime() + dt * 1000));
      if (st) pts.push({ x: x2(st.lon), y: y2(st.lat) });
    }
    ctx.strokeStyle = "rgba(90,208,255,.6)"; ctx.beginPath();
    var started = false;
    for (var i = 0; i < pts.length; i++) {
      if (i > 0 && Math.abs(pts[i].x - pts[i - 1].x) > MW / 2) { started = false; } // wrap
      if (!started) { ctx.moveTo(pts[i].x, pts[i].y); started = true; }
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    var cur = ISS.stateAt(satrec, observer, now);
    if (!cur) return;

    // footprint (visibility circle on the ground)
    var ryDeg = cur.footprintKm / 111.32;
    var rxDeg = ryDeg / Math.max(0.2, Math.cos(cur.lat * D2R));
    ctx.beginPath();
    ctx.ellipse(x2(cur.lon), y2(cur.lat), rxDeg / 360 * MW, ryDeg / 180 * MH, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(90,208,255,.08)"; ctx.fill();
    ctx.strokeStyle = "rgba(90,208,255,.25)"; ctx.lineWidth = 1; ctx.stroke();

    // observer
    var ox = x2(observer.lonDeg), oy = y2(observer.latDeg);
    ctx.fillStyle = "#ffcc66";
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,204,102,.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.stroke();

    // ISS
    var sx = x2(cur.lon), sy = y2(cur.lat);
    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    glow.addColorStop(0, "rgba(255,255,255,.9)"); glow.addColorStop(.3, "rgba(90,208,255,.6)");
    glow.addColorStop(1, "rgba(90,208,255,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function isDark(lat, lon, phiS, lamS) {
    return Math.sin(lat * D2R) * Math.sin(phiS * D2R) +
           Math.cos(lat * D2R) * Math.cos(phiS * D2R) * Math.cos((lon - lamS) * D2R) < 0;
  }
  function termLat(lon, phiS, lamS) {
    var t = Math.tan(phiS * D2R);
    if (Math.abs(t) < 1e-4) t = (t < 0 ? -1 : 1) * 1e-4;
    var v = Math.atan(-Math.cos((lon - lamS) * D2R) / t) / D2R;
    return Math.max(-90, Math.min(90, v));
  }

  /* ============================================================ STATS + STATUS */
  function setText(id, v) { var n = $(id); if (n) n.textContent = v; }
  function updateStats(now) {
    if (!satrec) return;
    var st = ISS.stateAt(satrec, observer, now);
    if (!st) return;
    setText("#s-lat", st.lat.toFixed(2));
    setText("#s-lon", st.lon.toFixed(2));
    setText("#s-alt", Math.round(st.altKm));
    setText("#s-speed", (st.speedKms * 3600).toFixed(0)); // km/h
    setText("#s-range", Math.round(st.rangeKm));
    setText("#s-el", st.elDeg > 0 ? st.elDeg.toFixed(0) : "—");

    var dist = ISS.groundDistanceKm(observer, st.lat, st.lon);
    setText("#s-ground", Math.round(dist));

    // status pill
    var pill = $("#status");
    pill.className = "pill";
    var label = $("#status-label"), dirn = ISS.compass(st.azDeg);
    if (st.elDeg > 0) {
      pill.classList.add(st.visibleNow ? "is-visible" : "is-up");
      label.textContent = (st.visibleNow ? "Visible overhead now! " : "Above your horizon — ") +
        st.elDeg.toFixed(0) + "° up, " + dirn;
      maybeNotifyOverhead(st);
    } else {
      label.textContent = "Below the horizon — " + Math.round(dist) + " km away";
    }

    // next pass countdown
    var np = passes.filter(function (p) { return p.start.getTime() > now.getTime(); })[0]
          || passes.filter(function (p) { return p.end.getTime() > now.getTime(); })[0];
    if (np) {
      var rising = np.start.getTime() > now.getTime();
      setText("#np-count", rising ? fmtCountdown(np.start - now) : "NOW");
      setText("#np-info", "to the " + ISS.compass(np.startAz) + " · peaks " + np.maxEl.toFixed(0) + "° · " +
        (np.visible ? "visible" : "daytime/low") );
    } else {
      setText("#np-count", "—"); setText("#np-info", "calculating…");
    }
  }

  /* ============================================================ PASSES LIST */
  function renderPasses() {
    var host = $("#passes"); host.innerHTML = "";
    var list = passes.slice(0, 8);
    if (!list.length) { host.innerHTML = '<p class="muted">No passes found in the next 48 hours.</p>'; return; }
    list.forEach(function (p) {
      var el = document.createElement("div"); el.className = "pass";
      el.innerHTML =
        '<div class="pass__when"><div class="d">' + fmtDay(p.start) + '</div>' +
          '<div class="t">' + fmtTime(p.start) + '</div></div>' +
        '<div class="pass__mid"><div class="dir">' + ISS.compass(p.startAz) + ' → ' + ISS.compass(p.endAz) +
          (p.visible ? ' <span class="badge">VISIBLE</span>' : '') + '</div>' +
          '<div class="sub">Duration ' + fmtDur(p.durationSec) + ' · peak to the ' + ISS.compass(p.maxAz) + '</div></div>' +
        '<div class="pass__el"><div class="deg">' + p.maxEl.toFixed(0) + '°</div><div class="lab">max</div></div>';
      host.appendChild(el);
    });
  }

  /* ============================================================ NOTIFICATIONS */
  var notifyOn = false, notified = {}, lastOverheadNotify = 0;
  function initNotify() {
    var btn = $("#notifyBtn");
    if (!("Notification" in window)) { btn.textContent = "Alerts unsupported"; btn.disabled = true; return; }
    syncNotifyBtn();
    btn.addEventListener("click", function () {
      if (Notification.permission === "granted") { notifyOn = !notifyOn; syncNotifyBtn(); return; }
      Notification.requestPermission().then(function (p) { notifyOn = (p === "granted"); syncNotifyBtn(); });
    });
    setInterval(checkUpcoming, 15000);
  }
  function syncNotifyBtn() {
    var btn = $("#notifyBtn");
    if (Notification.permission === "granted") {
      btn.textContent = notifyOn ? "🔔 Alerts on" : "🔕 Alerts off";
      btn.classList.toggle("btn--cyan", notifyOn);
    } else { btn.textContent = "🔔 Enable alerts"; }
  }
  function fireNotify(title, body) {
    if (!notifyOn || Notification.permission !== "granted") return;
    try { new Notification(title, { body: body, icon: iconDataUri() }); } catch (e) {}
    chime();
  }
  function checkUpcoming() {
    if (!notifyOn) return;
    var now = Date.now();
    passes.forEach(function (p) {
      var key = "" + p.start.getTime(), lead = p.start.getTime() - now;
      if (lead > 0 && lead < 5 * 60 * 1000 && !notified[key]) {
        notified[key] = true;
        fireNotify("🛰️ ISS pass in " + Math.round(lead / 60000) + " min",
          "Rises to the " + ISS.compass(p.startAz) + ", peaks " + p.maxEl.toFixed(0) + "°" +
          (p.visible ? " — should be visible!" : "."));
      }
    });
  }
  function maybeNotifyOverhead(st) {
    if (!notifyOn) return;
    var now = Date.now();
    if (st.elDeg > 25 && now - lastOverheadNotify > 10 * 60 * 1000) {
      lastOverheadNotify = now;
      fireNotify("🛰️ The ISS is overhead!", "Look " + ISS.compass(st.azDeg) + ", " +
        st.elDeg.toFixed(0) + "° above the horizon." + (st.visibleNow ? " It's visible right now." : ""));
    }
  }
  function chime() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      var a = new Ctx(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination); o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.9);
      o.start(); o.stop(a.currentTime + 0.95);
    } catch (e) {}
  }
  function iconDataUri() {
    return "data:image/svg+xml," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#05070f"/><circle cx="32" cy="32" r="7" fill="#5ad0ff"/></svg>');
  }

  /* ============================================================ LOCATION UI */
  function initLocation() {
    setLocNote();
    $("#geoBtn").addEventListener("click", function () {
      if (!navigator.geolocation) { setBanner("warn", "Geolocation isn't available in this browser. Enter coordinates manually."); return; }
      $("#geoBtn").textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        observer = { latDeg: pos.coords.latitude, lonDeg: pos.coords.longitude,
          altKm: (pos.coords.altitude || 0) / 1000, label: "Your location" };
        saveLoc(observer); $("#geoBtn").textContent = "📍 Use my location";
        onLocationChanged();
      }, function () {
        $("#geoBtn").textContent = "📍 Use my location";
        setBanner("warn", "Couldn't get your location. You can type your latitude & longitude instead.");
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
    $("#setLoc").addEventListener("click", function () {
      var la = parseFloat($("#latIn").value), lo = parseFloat($("#lonIn").value);
      if (isNaN(la) || isNaN(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
        setBanner("warn", "Please enter a valid latitude (−90…90) and longitude (−180…180)."); return;
      }
      observer = { latDeg: la, lonDeg: lo, altKm: 0, label: "Custom location" };
      saveLoc(observer); onLocationChanged();
    });
  }
  function setLocNote() {
    $("#latIn").value = observer.latDeg.toFixed(4);
    $("#lonIn").value = observer.lonDeg.toFixed(4);
    setText("#locNote", "Observing from " + (observer.label || "your location") + " · " +
      observer.latDeg.toFixed(3) + ", " + observer.lonDeg.toFixed(3));
  }
  function onLocationChanged() {
    setLocNote();
    notified = {};
    recomputePasses();
  }

  /* ============================================================ BANNER */
  function setBanner(kind, msg) {
    var b = $("#banner");
    if (!msg) { b.style.display = "none"; return; }
    b.style.display = "flex"; b.className = "banner banner--" + kind;
    b.innerHTML = "<span>" + (kind === "err" ? "⚠️" : "ℹ️") + "</span><span>" + msg + "</span>";
  }

  /* ============================================================ BOOT */
  function recomputePasses() {
    if (!satrec) return;
    passes = ISS.predictPasses(satrec, observer, { hours: 48, stepSec: 20, minEl: 10 });
    renderPasses();
  }

  function tick() {
    var now = new Date();
    drawMap(now);
    updateStats(now);
  }

  function boot() {
    initMap();
    initLocation();
    initNotify();

    ISS.ensureLib()
      .then(function () { return ISS.fetchTLE(); })
      .then(function (tle) {
        tleInfo = tle; satrec = ISS.makeSatrec(tle);
        setText("#tle-time", "Orbit data loaded · " + new Date(tle.fetchedAt).toLocaleString());
        setBanner(null);
        recomputePasses();
        tick();
        setInterval(tick, 1000);
        // refresh orbit data every 2 hours
        setInterval(function () { ISS.fetchTLE(true).then(function (t) {
          tleInfo = t; satrec = ISS.makeSatrec(t); recomputePasses();
        }).catch(function () {}); }, 2 * 3600 * 1000);
      })
      .catch(function (e) {
        setBanner("err", "Couldn't load the ISS orbit data or the math library. " +
          "Check your connection and refresh. (" + (e && e.message ? e.message : "network error") + ")");
      });
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
