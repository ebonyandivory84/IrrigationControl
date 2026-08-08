# Irrigation Adapter — Projektanweisungen

## Projektkontext
- **Ziel**: ioBroker-Adapter `iobroker.irrigation-control`, der das bisherige Bewässerungs-Skript (js-controller Script) ablöst und über eine eigene WebUI steuerbar macht.
- **Typ**: ioBroker-Adapter (Node.js Backend + React/Vite Frontend)
- **Status**: In Entwicklung
- **Auftraggeber**: Eigenprojekt
- **Repo**: https://github.com/ebonyandivory84/IrrigationControl
- **Ziel-System**: ioBroker unter `192.168.44.31` (SSH-Key `~/.ssh/id_ed25519_iobroker`)

## Tech-Stack
- Backend: Node.js, `@iobroker/adapter-core`, Express (eigener HTTP-Server + REST-API)
- Frontend: React + Vite, Glassmorphism/"Liquid Glass"-Design (siehe `ecc:liquid-glass-design` / `ecc:frontend-design-direction` als Inspirationsquelle, Prinzipien auf CSS übertragen)
- Wetterdaten: `sainlogic.0.*` (Echtzeit, lokal), Open-Meteo API (Regen-Vorhersage, kostenlos, kein Key)

## Hardware-Modell
- 2 Zigbee-Ventile → je ein GARDENA Wasserverteiler Automatic (1197-20)
  - Ventil A (`zigbee.0.28dba7fffe6d0211.state`) → 6-fach-Verteiler, Zonen 1–6
  - Ventil B (`zigbee.0.28dba7fffe6d020c.state`) → 2-fach-Verteiler, Zonen 7–8
- Pumpe: `zigbee.0.f0d1b8be240b0bd8.state`
- Verteiler schalten mechanisch beim Wiedereinschalten des Wasserflusses weiter — Zonenreihenfolge ist fix, **eine globale Zyklusdauer gilt für alle Zonen** (verhindert Desync bei manuellem Weiterschalten)
- Nie beide Ventile gleichzeitig offen (Wasserdruck)

## Funktionsumfang
- **Zeitplan-Modus**: Wochentage (7 Einzel-Checkboxen), eine Startzeit, eine globale Zyklusdauer für alle Zonen
- **Automatik-Modus**: ersetzt den Zeitplan komplett, wenn aktiv. Schwellenwerte für Hitze/Sonneneinstrahlung/Regen (aktuell + Vorhersage), Häufigkeit/Tag
- **Manueller Start/Stop**: wie im Ursprungsskript
- **WebUI**: Dashboard, Zeitplan, Automatik, Einstellungen (Hintergrundbild + Unschärfe/Dimm-Regler), Verlauf

## Prioritäten in diesem Projekt
1. Funktionierendes Backend (Ventilsteuerung, States) vor UI-Feinschliff
2. Mobile-first (Nutzung am Handy im Garten)
3. Bestehende Zigbee-Datenpunkte nicht verändern, nur lesen/schreiben

## Verbotene Aktionen in diesem Projekt
- Keinerlei bestehende ioBroker-Skripte löschen — nur deaktivieren, und nur nach expliziter Bestätigung
- Kein automatischer Zugriff auf Produktions-Ventile/Pumpe während der Entwicklung ohne Rücksprache

## Wichtige Entscheidungen (Changelog)
- `2026-08-08` — `www/` (Frontend-Build) nicht mehr in `.gitignore`, sondern eingecheckt. Ursache: ioBroker installiert den Adapter per `npm install <github-url>` direkt aus dem Git-Repo — dabei zählt nur, was im Repo committed ist, `.npmignore`/`package.json#files` greifen hier nicht. War `www/` nur lokal vorhanden (gitignored), fehlte es nach jedem Reinstall/Update komplett (führte zu `ENOENT .../www/index.html`). Konsequenz: vor jedem Push `npm run build:frontend` ausführen und den aktualisierten `www/`-Stand mitcommitten, sonst deployt ein veraltetes Frontend.
- `2026-08-02` — Zonen-Modell geklärt: physische Zonen über Gardena-Verteiler, nicht Soak-Cycle. Eine globale Zyklusdauer für alle Zonen (nicht pro Zone). Wochentage als 7 Einzel-Checkboxen, global für beide Verteiler.
- `2026-08-02` — Backend bewusst in plain JS statt TypeScript (kleiner Scope, kein Build-Schritt für den Adapter selbst nötig).
- `2026-08-02` — Sicherheits-Fix vor Deploy: `settings.scheduleEnabled` als expliziter Zeitplan-Ein/Aus-Schalter ergänzt (Default `false`). Ohne diesen Schalter wären bei Werks-Defaults (alle Wochentage `true`, Startzeit 05:00) nach dem Deploy sofort echte Läufe erfolgt — Verstoß gegen "kein automatischer Zugriff auf Produktions-Ventile ohne Rücksprache".
- `2026-08-05` — Automatik-Modus smarter (v0.2.0): Regen-Vorhersage wird stündlich abgerufen (`lib/weather.js`, `native.forecastFetchHour` entfernt). Neue Entscheidungslogik in `lib/scheduler.js` über ein Tages-Flag `status.autoMorningSkippedForRain`: Nachtrag tagsüber, sobald sich die Vorhersage verbessert; Abend-Fallback um 22:00, der nur den tatsächlich gemessenen Regen prüft (ignoriert Vorhersage), falls morgens wegen Regenmeldung ausgesetzt wurde; optionale dritte, hitzegetriggerte Zwischenwässerung (`autoMaxRunsPerDay: 3`). Defaults für `autoMorningTime`/`autoEveningTime` auf `04:00`/`22:00` (verdunstungsärmer) geändert — bestehende Werte auf der Produktivinstanz werden dadurch nicht automatisch überschrieben. UI-Zentrierungs-Fix (`.app-main` auf Desktop mittig statt linksbündig).
- `2026-08-02` — Sicherheits-Timeout Gesamtlauf (v0.3.0) von `native.maxTotalRuntimeSec` (Admin, restart-pflichtig) nach `settings.maxTotalRuntimeSec` (Live-Setting) migriert, exakt nach dem `cycleDurationSec`-Muster (`lib/scheduler.js` DEFAULTS/`_ensureState`, `lib/webserver.js` SETTINGS_KEYS, `lib/irrigationEngine.js` `runZones()` liest jetzt den State). Auslöser: Produktiv-Vorfall, bei dem der 90-Min-Deckel einen 8-Zonen-Lauf (~200 Min Bedarf bei 1500s/Zone) still abgebrochen hat. Neue Card "Sicherheit" in `Settings.jsx` mit Minuten-Feld + proaktivem Warnbanner, sobald `Zonenanzahl × Zyklusdauer` den Timeout überschreitet. Wettervorhersage (`lib/weather.js`) um `tempForecastMaxC`/`rainForecastMm`/`sunForecastMJm2` erweitert (Open-Meteo `daily`-Query), Dashboard-Wetter-Card in "Aktuell"/"Vorhersage" aufgeteilt (neue `.weather-grid-2`-Klasse). Versions-Drift behoben: `package.json` und `io-package.json` beide auf `0.3.0` synchronisiert.
- `2026-08-02` — v0.3.1: "WebUI öffnen"-Icon in der Admin-Instanzübersicht reagierte nicht auf Klick — Ursache war ungültige Platzhalter-Syntax `%native.httpPort%` (Punkt) in `io-package.json`'s `common.localLinks`; ioBroker erwartet `%native_httpPort%` (Unterstrich), bestätigt per Vergleich mit anderen lokalen Adaptern (`BMW-Leasing-App`, `smarthome-dashboard-iii`). Dashboard-Wetter-Card zusätzlich um `buildAutomatikNote()` (`Dashboard.jsx`) erweitert: Fließtext unter der Vorhersage, der klientenseitig aus `settings` + `status.weather` ableitet und begründet, ob/wann die Automatik wässert oder warum sie aussetzt (Regen aktuell/Vorhersage vs. Schwellenwerte, Zeitplan-Modus, veraltete Wetterdaten).
- `2026-08-02` — v0.3.2: Zonen-Card auf dem Dashboard 2-spaltig (`zone-list-compact`), Verteiler-Zugehörigkeit als kompaktes A/B-Badge statt ausgeschriebenem Text. Sonnenstrahlung-Vorhersage in kWh/m² statt MJ/m² angezeigt (reine Anzeige-Umrechnung ÷3,6 in `Dashboard.jsx`, Backend-State `weather.sunForecastMJm2` bleibt unverändert in MJ/m²).
- `2026-08-02` — v0.3.3: Sicherheits-Timeout-Warnbanner (Zyklusdauer × Zonenzahl vs. `maxTotalRuntimeSec`) war bisher nur unter "Einstellungen" sichtbar. Jetzt identische Berechnung/Text auch in `Schedule.jsx` und `Automatic.jsx` — beide Screens bekommen dafür die `status`-Prop (Zonenzahl) neu durchgereicht (`App.jsx`).
- `2026-08-02` — v0.4.1: Statusübersicht (`Dashboard.jsx`) zeigt jetzt neben dem bestehenden Aktiv/Bereit/Notaus-Badge ein zweites Badge, ob Automatik oder Manuell aktiv ist (`settings.automaticMode`). Neuer Container `.status-badges` (Flex, `App.css`) für die nebeneinanderliegenden Badges.
- `2026-08-02` — v0.4.0: Automatik-Modus von einem globalen Schwellenwert-Satz + exklusivem `autoMaxRunsPerDay`-Regler (1/2/3, kumulativ) auf drei unabhängig aktivierbare Läufe umgestellt — Morgenlauf, Abendlauf, Zwischenwässerung —, jeder mit eigenem vollständigem Schwellenwert-Satz (Temperatur, Sonneneinstrahlung, aktueller Regen, Regenvorhersage-Prozent). Neue Settings-Keys `autoMorning*`/`autoEvening*`/`autoInterim*` (je `Enabled`, `TempThresholdC`, `SunThreshold[MJm2|Wm2]`, `RainCurrentThresholdMm`, `RainForecastThresholdPct`) ersetzen die 5 alten globalen Keys (`autoTempThresholdC`, `autoSunThresholdWm2`, `autoRainCurrentThresholdMm`, `autoRainForecastThresholdPct`, `autoMaxRunsPerDay`) in `lib/scheduler.js` (DEFAULTS, `init()`, `_heatGateMet()`, `_tickAutomatic()` mit 4 Prüfpunkten) und `lib/webserver.js` (`SETTINGS_KEYS`). Morgen/Abend prüfen die Hitze-/Sonnenschwelle gegen die Vorhersage (Sonnenschwelle in MJ/m², UI zeigt kWh/m²), die Zwischenwässerung gegen aktuell gemessene Live-Werte (Sonnenschwelle in W/m², den ganzen Tag über neu geprüft, kein endgültiges Aussetzen). `Automatic.jsx` komplett neu aufgebaut: drei `RunCard`-Blöcke mit eigenem Enable-Schalter, plus `buildThresholdWarnings()` — warnt, wenn ein späterer Lauf (Abend ggü. Morgen, Zwischenwässerung ggü. Abend) leichter auslösende Schwellen hat als ein früherer aktivierter Lauf (vermutlich Konfigurationsfehler). `Dashboard.jsx`s `buildAutomatikNote()` wertet jeden aktivierten Lauf einzeln aus (gleiche Prüfreihenfolge wie Backend: Hitze-/Sonnenschwelle → aktueller Regen → Regenvorhersage). Die alten globalen Schwellenwert-States werden nicht mehr erzeugt und bleiben nach dem Deploy als verwaiste States in ioBroker stehen (unkritisch). **Wichtig**: Bestehende Schwellenwerte auf der Produktivinstanz werden beim Deploy NICHT automatisch in die drei neuen Läufe übernommen — nach dem Deploy müssen die drei neuen Karten auf der Automatik-Seite manuell geprüft und befüllt werden, sonst laufen alle Läufe mit den Code-Defaults.
