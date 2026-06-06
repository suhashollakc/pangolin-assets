/* =============================================================================
   Overhead — ISS core engine
   -----------------------------------------------------------------------------
   Pure logic (no DOM). Loads satellite.js (SGP4), fetches the ISS orbit (TLE),
   and computes: live position, look angles in YOUR sky, sunlight/visibility,
   and predictions of upcoming passes.

   Everything that talks to the network runs in the *browser*, using free,
   no-key, CORS-friendly sources. Nothing here needs an API key.
   ============================================================================= */
window.ISS = (function () {
  "use strict";

  var SAT_ID = 25544;                 // NORAD id of the ISS (ZARYA)
  var TLE_CACHE = "overhead_tle_v1";
  var Re = 6378.137;                  // Earth equatorial radius, km
  var AU = 149597870.7;               // km

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function mag(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }

  /* --------------------------------------------------- load satellite.js (SGP4) */
  var SAT_CDNS = [
    "https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js",
    "https://unpkg.com/satellite.js@5.0.0/dist/satellite.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/satellite.js/5.0.0/satellite.min.js",
  ];
  var _libPromise = null;
  function ensureLib() {
    if (window.satellite) return Promise.resolve(window.satellite);
    if (_libPromise) return _libPromise;
    _libPromise = new Promise(function (resolve, reject) {
      var i = 0;
      (function tryNext() {
        if (window.satellite) return resolve(window.satellite);
        if (i >= SAT_CDNS.length) return reject(new Error("Could not load the orbit-math library."));
        var s = document.createElement("script");
        s.src = SAT_CDNS[i++];
        s.async = true;
        s.onload = function () { window.satellite ? resolve(window.satellite) : tryNext(); };
        s.onerror = tryNext;
        document.head.appendChild(s);
      })();
    });
    return _libPromise;
  }

  /* ------------------------------------------------------------- fetch the TLE */
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); },
                   function (e) { clearTimeout(t); reject(e); });
    });
  }

  // Source 1: Celestrak (plain text, 3 lines)
  function fromCelestrak() {
    var url = "https://celestrak.org/NORAD/elements/gp.php?CATNR=" + SAT_ID + "&FORMAT=TLE";
    return withTimeout(fetch(url), 12000).then(function (r) { return r.text(); }).then(function (txt) {
      var lines = txt.trim().split(/\r?\n/).map(function (l) { return l.trim(); });
      var l1 = lines.filter(function (l) { return l.indexOf("1 ") === 0; })[0];
      var l2 = lines.filter(function (l) { return l.indexOf("2 ") === 0; })[0];
      if (!l1 || !l2) throw new Error("bad celestrak data");
      return { name: lines[0] || "ISS (ZARYA)", line1: l1, line2: l2 };
    });
  }
  // Source 2: ivanstanojevic TLE API (JSON)
  function fromIvan() {
    var url = "https://tle.ivanstanojevic.me/api/tle/" + SAT_ID;
    return withTimeout(fetch(url), 12000).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.line1 || !j.line2) throw new Error("bad ivan data");
      return { name: j.name || "ISS (ZARYA)", line1: j.line1, line2: j.line2 };
    });
  }

  function fetchTLE(force) {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(TLE_CACHE) || "null"); } catch (e) {}
    if (!force && cached && (Date.now() - cached.fetchedAt) < 2 * 3600 * 1000) {
      return Promise.resolve(cached);
    }
    return fromCelestrak()
      .catch(function () { return fromIvan(); })
      .then(function (tle) {
        tle.fetchedAt = Date.now();
        try { localStorage.setItem(TLE_CACHE, JSON.stringify(tle)); } catch (e) {}
        return tle;
      })
      .catch(function (e) {
        if (cached) return cached;          // last resort: stale cache
        throw e;
      });
  }

  /* ---------------------------------------------------------- the Sun (low precision) */
  // Sun position in ECI (km). Good enough (~0.01°) for horizon & shadow tests.
  function sunEci(date) {
    var jd = date.getTime() / 86400000 + 2440587.5;
    var d = jd - 2451545.0;                       // days since J2000
    var g = (357.529 + 0.98560028 * d) * D2R;     // mean anomaly
    var q = 280.459 + 0.98564736 * d;             // mean longitude (deg)
    var L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R; // ecliptic lon
    var eps = (23.439 - 3.6e-7 * d) * D2R;        // obliquity
    var R = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g); // AU
    var r = R * AU;
    return { x: r * Math.cos(L), y: r * Math.cos(eps) * Math.sin(L), z: r * Math.sin(eps) * Math.sin(L) };
  }

  /* ------------------------------------------------------------- build a satrec */
  function makeSatrec(tle) { return window.satellite.twoline2satrec(tle.line1, tle.line2); }

  // observer: {latDeg, lonDeg, altKm}
  function observerGd(o) {
    return { longitude: o.lonDeg * D2R, latitude: o.latDeg * D2R, height: (o.altKm || 0) };
  }

  /* ---------------------------------------------------- full state at a moment */
  function stateAt(satrec, o, date) {
    var S = window.satellite;
    var pv = S.propagate(satrec, date);
    if (!pv || !pv.position) return null;
    var gmst = S.gstime(date);
    var posEci = pv.position, velEci = pv.velocity;
    var geo = S.eciToGeodetic(posEci, gmst);
    var lat = S.degreesLat(geo.latitude), lon = S.degreesLong(geo.longitude);
    var altKm = geo.height;

    var gd = observerGd(o);
    var ecf = S.eciToEcf(posEci, gmst);
    var look = S.ecfToLookAngles(gd, ecf);

    // Sun: observer altitude + ISS illumination
    var sun = sunEci(date);
    var sunEcf = S.eciToEcf(sun, gmst);
    var sunLook = S.ecfToLookAngles(gd, sunEcf);
    var sunAlt = sunLook.elevation * R2D;

    var lit = isSunlit(posEci, sun);
    var speed = velEci ? mag(velEci) : 0;
    var footprintKm = Re * Math.acos(Re / (Re + altKm));

    return {
      date: date, lat: lat, lon: lon, altKm: altKm, speedKms: speed,
      azDeg: ((look.azimuth * R2D) + 360) % 360,
      elDeg: look.elevation * R2D,
      rangeKm: look.rangeSat,
      footprintKm: footprintKm,
      sunAltDeg: sunAlt, lit: lit,
      visibleNow: (sunAlt < -6 && lit && look.elevation * R2D > 0),
      posEci: posEci
    };
  }

  // Cylindrical Earth-shadow test: is the satellite in sunlight?
  function isSunlit(satEci, sunEci) {
    var sm = mag(sunEci);
    var u = { x: sunEci.x / sm, y: sunEci.y / sm, z: sunEci.z / sm };
    var dot = satEci.x * u.x + satEci.y * u.y + satEci.z * u.z;
    if (dot > 0) return true;                       // sun-facing side
    var satMag2 = satEci.x * satEci.x + satEci.y * satEci.y + satEci.z * satEci.z;
    var perp = Math.sqrt(Math.max(0, satMag2 - dot * dot));
    return perp > Re;                               // outside Earth's shadow cylinder
  }

  // sub-solar point (lat/lon where the Sun is overhead) — for day/night map
  function subsolar(date) {
    var S = window.satellite;
    var ecf = S.eciToEcf(sunEci(date), S.gstime(date));
    var m = mag(ecf);
    return { lat: Math.asin(ecf.z / m) * R2D, lon: Math.atan2(ecf.y, ecf.x) * R2D };
  }

  /* ------------------------------------------------ predict upcoming passes */
  // opts: {hours, stepSec, minEl}. A pass = continuous interval above the horizon.
  function predictPasses(satrec, o, opts) {
    opts = opts || {};
    var hours = opts.hours || 48, step = (opts.stepSec || 20) * 1000, minEl = opts.minEl || 10;
    var start = Date.now(), end = start + hours * 3600 * 1000;
    var passes = [], cur = null, prev = null;

    for (var t = start; t <= end; t += step) {
      var d = new Date(t);
      var st = stateAt(satrec, o, d);
      if (!st) { prev = null; continue; }
      var el = st.elDeg;

      if (el > 0) {
        if (!cur) {
          cur = {
            start: d, startAz: st.azDeg, maxEl: el, maxAz: st.azDeg, maxAt: d,
            end: d, endAz: st.azDeg, visible: !!st.visibleNow
          };
          // refine rise time by interpolating the horizon crossing
          if (prev) cur.start = new Date(interpCross(prev.t, prev.el, t, el));
        } else {
          if (el > cur.maxEl) { cur.maxEl = el; cur.maxAz = st.azDeg; cur.maxAt = d; }
          if (st.visibleNow) cur.visible = true;
          cur.end = d; cur.endAz = st.azDeg;
        }
      } else if (cur) {
        if (prev) cur.end = new Date(interpCross(prev.t, prev.el, t, el));
        if (cur.maxEl >= minEl) passes.push(finalize(cur));
        cur = null;
      }
      prev = { t: t, el: el };
    }
    if (cur && cur.maxEl >= minEl) passes.push(finalize(cur));
    return passes;
  }
  function interpCross(t0, e0, t1, e1) {
    var f = e0 / (e0 - e1);                 // fraction where elevation = 0
    return t0 + (t1 - t0) * Math.max(0, Math.min(1, f));
  }
  function finalize(p) {
    p.durationSec = Math.round((p.end - p.start) / 1000);
    return p;
  }

  /* ------------------------------------------------------------- helpers */
  var COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  function compass(az) { return COMPASS[Math.round(((az % 360) / 22.5)) % 16]; }

  // great-circle distance (km) between observer and the ground point under the ISS
  function groundDistanceKm(o, lat, lon) {
    var p1 = o.latDeg * D2R, p2 = lat * D2R, dl = (lon - o.lonDeg) * D2R, dp = p2 - p1;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return Re * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return {
    ensureLib: ensureLib,
    fetchTLE: fetchTLE,
    makeSatrec: makeSatrec,
    stateAt: stateAt,
    predictPasses: predictPasses,
    subsolar: subsolar,
    compass: compass,
    groundDistanceKm: groundDistanceKm,
    SAT_ID: SAT_ID,
  };
})();
