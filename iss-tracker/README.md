# Overhead — Live ISS Tracker 🛰️

Track the **International Space Station** in real time, see its path across
*your* sky, get an alert the moment it’s about to pass over you — and project a
**planetarium sky-dome onto your ceiling**.

It’s a static site (no build, no server, no API keys) — all the orbital math
runs in your browser.

---

## Two views

### 🌍 Dashboard — `index.html`
- **Live world map** with the ISS, its ground track (one orbit), your location,
  and the visibility footprint, over a real-time day/night terminator.
- **Telemetry**: latitude, longitude, altitude, speed, distance to you, and the
  ISS’s **elevation in your sky**.
- **Next pass countdown** + a list of **upcoming passes for the next 48 h**
  (time, direction, peak elevation, duration, and a **VISIBLE** badge for passes
  you could actually see at twilight).
- **Alerts**: browser notifications + a soft chime ~5 min before a pass and when
  the ISS climbs overhead.

### ✦ Ceiling Mode — `ceiling.html`
A pure-black **sky dome** built to be projected straight up:
- Zenith at the centre, horizon at the edge, N/E/S/W labels, elevation rings.
- The ISS glows and traces its **arc across your sky**; a faint dashed arc shows
  the next pass.
- A big **“next pass in 12:34”** countdown when it’s below the horizon.
- Keeps the screen awake (Wake Lock), has a **Fullscreen** button, and a
  **Looking-up / Map** toggle that mirrors East↔West so it matches what you see
  when lying on your back.

---

## How it works

| Piece | Source |
|-------|--------|
| Orbit propagation (SGP4) | [`satellite.js`](https://github.com/shashwatak/satellite-js) loaded from a CDN |
| ISS orbit data (TLE) | [Celestrak](https://celestrak.org), with a fallback TLE API |
| Your location | Browser **Geolocation** (or type coordinates manually) |
| Sun / visibility | Low-precision solar position + cylindrical Earth-shadow test |

Everything is computed locally from the TLE — position, your-sky angles, passes,
and visibility. No location data ever leaves your device.

---

## Run it

```bash
cd iss-tracker
python3 -m http.server 8000
# open http://localhost:8000
```

Serve over `http://` (not `file://`) so geolocation, notifications and the CDN
load correctly. For alerts/geolocation on a real domain you’ll need **HTTPS**
(GitHub Pages provides this automatically).

> **For ceiling projection:** open `ceiling.html`, hit **Fullscreen**, connect a
> projector pointed at the ceiling, and lie back. Toggle **Looking-up** so the
> compass directions match your view.

---

## Notes & accuracy
- Pass times are typically accurate to a few seconds when the TLE is fresh
  (it auto-refreshes every 2 hours).
- “VISIBLE” means the ISS is sunlit while your sky is dark (sun > 6° below the
  horizon) — the conditions for naked-eye sightings.
- Default location is Greenwich until you set your own.
