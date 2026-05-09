# Kompass · Wettbewerbs-Cockpit für Heißluftballon-Piloten

iPad-PWA zum Mitnehmen in den Korb. Kombiniert Wettbewerbs-Tasks mit Live-GPS,
intelligenter 60-Minuten-Trajektorie und Höhenprofil-Empfehlungen für Targets.
Single-File-PWA, basiert auf der Trajektorien-Mathematik des "Verfolger" und
"Ballonstart Planer".

## Features (Stufe 1 — dieser MVP)

- **Live-GPS-Konsole**: Track, Geschwindigkeit, Höhe MSL, VSI — geglättet, gut
  ablesbar bei Sonnenlicht (Tag-Modus) oder im Halbdunkel (Nacht-Modus)
- **Intelligente 60-Minuten-Trajektorie**: gebogen entsprechend Wind-Schichtung
  in der aktuellen Höhe, mit 15-Minuten-Markern
- **Targets als nummerierte Marker**: aufgelöst aus DMV-üblicher UTM-Kurzform
  (z. B. `7865 7734`) über frei wählbaren Referenzpunkt
- **Höhenprofil-Empfehlung**: zu jedem Target wird die optimale Reisehöhe
  berechnet — minimale Distanz zum Target am Endpunkt
- **Geteilte Ansicht**: Karte + dauerhafte Datenkonsole, optimiert für iPad
  Quer- und Hochformat
- **Tag-/Nacht-Toggle**: hellgrau/schwarz für Sonne, dunkel/hell für Halbdunkel
- **Offline-fähig nach Wetter-Pull**: Beim "Fly"-Tap wird einmal eine 8-Stunden-
  ICON-Vorhersage geladen und gecacht. Danach läuft die Trajektorie auch im
  Funkloch weiter

## Stufe 2 (geplant, nicht in diesem Build)

- PDF-Tasksheet-Import mit Textebene (`pdf.js` + Regex-Parser)
- Foto-Tasksheet-Import via Claude Vision API
- Beobachtungsmarker (Drift-/Inversion-Notizen während des Flugs)
- GeoJSON-Export für Planer-Integration

## Datenquellen

- **Wetter**: [Open-Meteo](https://open-meteo.com/) (DWD-ICON-Modell, kostenlos,
  kein API-Key)
- **Karten**: OpenStreetMap, Esri World Imagery (Satellit)

## Deployment

### Netlify Drop (einfachste Methode)

1. Den **gesamten Ordner-Inhalt** auf <https://app.netlify.com/drop> ziehen
   (NICHT den Ordner selbst — also `index.html`, `manifest.webmanifest`,
   `service-worker.js`, `icons/`, `_headers`, `netlify.toml`, `robots.txt`)
2. Netlify deployt sofort und vergibt eine zufällige URL
3. Optional in den Site-Settings einen eigenen Subdomain-Namen setzen

### IONOS / sonstiger Webspace

Reine Static-Site. Alle Dateien per FTP/SFTP in das Web-Root hochladen, fertig.
**Wichtig**: HTTPS muss aktiv sein, sonst funktioniert die GPS-Funktion nicht.

## Lokal testen

PWAs (Service Worker, Manifest) brauchen einen HTTP-Server, `file://` reicht
nicht:

```bash
cd kompass
python3 -m http.server 8000
# → http://localhost:8000
```

## Erste Schritte als Pilot

1. **Setup ⚙️**: Wettbewerbs-Name (optional), UTM-Zone (32U für Hessen/West,
   33U für Sachsen/Ost, etc.) und vor allem den **Referenzpunkt** setzen.
   Der Referenzpunkt ist das Zentrum des Wettbewerbsbereichs (z. B. die
   Briefing-Wiese). Er wird gebraucht, um die UTM-Kurzform aus dem Tasksheet
   in vollständige Koordinaten aufzulösen.
2. **+ Task**: Tasks aus dem Tasksheet abtippen — Nummer, Typ (Dropdown), UTM-
   Kurzform (4+4 Ziffern, mit oder ohne Leerzeichen), optional Scoring-Periode.
3. **▶ Fly**: Wetterdaten laden. Die App lädt einmal eine 8-Stunden-ICON-
   Vorhersage. Ab jetzt funktioniert sie auch ohne Mobilfunk.
4. **Tap auf Task**: zeigt das beste Höhenprofil zu diesem Target und zeichnet
   die Profil-Trajektorie auf die Karte.
5. **Erneutes Tap auf gleichen Task**: öffnet das Bearbeiten-Modal.

## Datei-Übersicht

| Datei | Zweck |
|---|---|
| `index.html` | Komplette App (Logik, UI, Karte, Berechnung) |
| `manifest.webmanifest` | PWA-Manifest für Installation |
| `service-worker.js` | Offline-Cache (App-Shell, Tile-Cache, Wetter-Cache) |
| `icons/icon.svg` | Master-Logo (Vector) |
| `icons/icon-{N}.png` | Raster-Icons in Größen 16–512 px |
| `icons/icon-{N}-maskable.png` | Maskable Icons für Android Adaptive-Icons |
| `icons/apple-touch-icon.png` | iOS Home-Screen-Icon |
| `_headers` | Netlify-Header (Service-Worker-Scope, Cache-Control) |
| `netlify.toml` | Netlify-Build-Config |
| `robots.txt` | Crawler-Erlaubnis |

## Hinweis

Nur zur Pilotenunterstützung. Keine Flugfreigabe, kein Ersatz für offizielle
Wetterquellen oder Wettbewerbs-Software. Berechnungen basieren auf Modell-
prognosen, die mehrere Kilometer abweichen können. Targets immer auf der
Karte verifizieren, bevor man sie anfliegt.

GPS-Höhe und VSI sind aus den Geräte-Sensoren des iPads geglättet — die
Genauigkeit liegt bei ±5–15 m Höhe und ±0,3 m/s VSI. Für strategische
Ballon-Entscheidungen reicht das. Für präzise Genauigkeitsaufgaben (PDG-
Zielwurf) ist ein dediziertes Vario die bessere Wahl.

## Architektur-Notizen

- **Single-File-PWA**: alles in einer `index.html`, kein Build-Step
- **Dependencies**: nur Leaflet (Karte) — keine Tailwind, kein Chart.js
- **State**: in 5 klar getrennten Objekten (`appState`, `gpsState`,
  `weatherState`, `tasksState`, `compState`)
- **GPS-Glättung**: gleitender Durchschnitt über 5 Samples für Speed/Track,
  lineare Regression über 6-Sekunden-Fenster für VSI
- **UTM**: eigene Implementierung nach Karney/Snyder, ausreichend genau für
  Wettbewerbsstrecken (< 100 km)
- **Wetter-Cache**: Service Worker fängt Open-Meteo-Calls ab und liefert beim
  Verbindungsverlust die letzte Antwort
