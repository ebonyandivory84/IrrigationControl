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
