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
- `2026-08-02` — Zonen-Modell geklärt: physische Zonen über Gardena-Verteiler, nicht Soak-Cycle. Eine globale Zyklusdauer für alle Zonen (nicht pro Zone). Wochentage als 7 Einzel-Checkboxen, global für beide Verteiler.
- `2026-08-02` — Backend bewusst in plain JS statt TypeScript (kleiner Scope, kein Build-Schritt für den Adapter selbst nötig).
- `2026-08-02` — Sicherheits-Fix vor Deploy: `settings.scheduleEnabled` als expliziter Zeitplan-Ein/Aus-Schalter ergänzt (Default `false`). Ohne diesen Schalter wären bei Werks-Defaults (alle Wochentage `true`, Startzeit 05:00) nach dem Deploy sofort echte Läufe erfolgt — Verstoß gegen "kein automatischer Zugriff auf Produktions-Ventile ohne Rücksprache".
- `2026-08-05` — Automatik-Modus smarter (v0.2.0): Regen-Vorhersage wird stündlich abgerufen (`lib/weather.js`, `native.forecastFetchHour` entfernt). Neue Entscheidungslogik in `lib/scheduler.js` über ein Tages-Flag `status.autoMorningSkippedForRain`: Nachtrag tagsüber, sobald sich die Vorhersage verbessert; Abend-Fallback um 22:00, der nur den tatsächlich gemessenen Regen prüft (ignoriert Vorhersage), falls morgens wegen Regenmeldung ausgesetzt wurde; optionale dritte, hitzegetriggerte Zwischenwässerung (`autoMaxRunsPerDay: 3`). Defaults für `autoMorningTime`/`autoEveningTime` auf `04:00`/`22:00` (verdunstungsärmer) geändert — bestehende Werte auf der Produktivinstanz werden dadurch nicht automatisch überschrieben. UI-Zentrierungs-Fix (`.app-main` auf Desktop mittig statt linksbündig).
- `2026-08-02` — Sicherheits-Timeout Gesamtlauf (v0.3.0) von `native.maxTotalRuntimeSec` (Admin, restart-pflichtig) nach `settings.maxTotalRuntimeSec` (Live-Setting) migriert, exakt nach dem `cycleDurationSec`-Muster (`lib/scheduler.js` DEFAULTS/`_ensureState`, `lib/webserver.js` SETTINGS_KEYS, `lib/irrigationEngine.js` `runZones()` liest jetzt den State). Auslöser: Produktiv-Vorfall, bei dem der 90-Min-Deckel einen 8-Zonen-Lauf (~200 Min Bedarf bei 1500s/Zone) still abgebrochen hat. Neue Card "Sicherheit" in `Settings.jsx` mit Minuten-Feld + proaktivem Warnbanner, sobald `Zonenanzahl × Zyklusdauer` den Timeout überschreitet. Wettervorhersage (`lib/weather.js`) um `tempForecastMaxC`/`rainForecastMm`/`sunForecastMJm2` erweitert (Open-Meteo `daily`-Query), Dashboard-Wetter-Card in "Aktuell"/"Vorhersage" aufgeteilt (neue `.weather-grid-2`-Klasse). Versions-Drift behoben: `package.json` und `io-package.json` beide auf `0.3.0` synchronisiert.
- `2026-08-02` — v0.3.1: "WebUI öffnen"-Icon in der Admin-Instanzübersicht reagierte nicht auf Klick — Ursache war ungültige Platzhalter-Syntax `%native.httpPort%` (Punkt) in `io-package.json`'s `common.localLinks`; ioBroker erwartet `%native_httpPort%` (Unterstrich), bestätigt per Vergleich mit anderen lokalen Adaptern (`BMW-Leasing-App`, `smarthome-dashboard-iii`). Dashboard-Wetter-Card zusätzlich um `buildAutomatikNote()` (`Dashboard.jsx`) erweitert: Fließtext unter der Vorhersage, der klientenseitig aus `settings` + `status.weather` ableitet und begründet, ob/wann die Automatik wässert oder warum sie aussetzt (Regen aktuell/Vorhersage vs. Schwellenwerte, Zeitplan-Modus, veraltete Wetterdaten).
- `2026-08-02` — v0.3.2: Zonen-Card auf dem Dashboard 2-spaltig (`zone-list-compact`), Verteiler-Zugehörigkeit als kompaktes A/B-Badge statt ausgeschriebenem Text. Sonnenstrahlung-Vorhersage in kWh/m² statt MJ/m² angezeigt (reine Anzeige-Umrechnung ÷3,6 in `Dashboard.jsx`, Backend-State `weather.sunForecastMJm2` bleibt unverändert in MJ/m²).
