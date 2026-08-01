# iobroker.irrigation-control

ioBroker-Adapter für die Rasenbewässerung mit eigener WebUI (React, Liquid-Glass-Design). Ersetzt ein bisheriges js-controller-Skript durch einen vollwertigen Adapter mit Zeitplan- und Wetter-Automatik.

## Funktionsumfang

- **Zeitplan**: Wochentage, Startzeit, eine globale Zyklusdauer je Zone
- **Automatik**: wetterbasiert (Temperatur, Sonneneinstrahlung, Regen aktuell/stündlich aktualisierte Vorhersage), bevorzugt morgens (04:00) / abends (22:00) wegen geringerer Verdunstung, optionale dritte hitzegetriggerte Zwischenwässerung, automatischer Regen-Fallback-Check abends falls sich die Vorhersage als falsch herausstellt
- **Manuelle Steuerung** + Notaus (`control.emergencyStop`, sperrt alle Läufe bis Reset)
- **WebUI**: Dashboard, Zeitplan, Automatik, Einstellungen (Hintergrundbild, Unschärfe/Dimm-Regler, Zonen-Umbenennung), Verlauf

## Hardware-Modell

2 Zigbee-Ventile, je ein GARDENA Wasserverteiler Automatic (1197-20):

- Ventil A → 6-fach-Verteiler, Zonen 1–6
- Ventil B → 2-fach-Verteiler, Zonen 7–8

Verteiler schalten mechanisch beim Wiedereinschalten des Wasserflusses weiter — Zonenreihenfolge ist fix, eine Zyklusdauer gilt für alle Zonen. Nie beide Ventile gleichzeitig offen.

## Wetterdaten

- Echtzeit: `sainlogic.0.*` (lokale Wetterstation)
- Regen-Vorhersage: [Open-Meteo](https://open-meteo.com/) (kostenlos, kein API-Key)

## Setup

```bash
npm install
npm run build:frontend   # baut das React-Frontend nach www/
```

## Entwicklung

```bash
cd frontend
npm run dev               # Vite-Devserver, proxied /api auf Port 8112
```

Adapter-Backend separat über ioBroker js-controller starten (`iobroker upload/start irrigation-control`).

## Konfiguration

Technische Einstellungen (Datenpunkte, Timeouts, Koordinaten) über die ioBroker-Admin-UI. Betriebseinstellungen (Zeitplan, Automatik-Schwellen, Hintergrundbild) live über die WebUI, ohne Adapter-Neustart.
