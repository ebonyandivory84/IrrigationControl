import GlassCard from '../components/GlassCard';
import { DropIcon, PlayIcon, StopIcon, WarningIcon, ThermoIcon, SunIcon, RainIcon } from '../components/icons';
import { formatClock, formatDateTime, TRIGGER_LABELS } from '../utils';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function buildAutomatikNote(settings, weather) {
  if (!settings || !settings.automaticMode) {
    return 'Automatik ist deaktiviert – die Bewässerung folgt dem festen Zeitplan, unabhängig von der Wettervorhersage.';
  }
  if (!weather || weather.stale) {
    return 'Wetterdaten sind veraltet – die Automatik pausiert Auslösungen, bis wieder aktuelle Daten vorliegen.';
  }

  const rainCurrentThreshold = settings.autoRainCurrentThresholdMm ?? 0.15;
  const rainForecastThreshold = settings.autoRainForecastThresholdPct ?? 50;
  const morningTime = settings.autoMorningTime || '04:00';
  const eveningTime = settings.autoEveningTime || '22:00';
  const maxRuns = settings.autoMaxRunsPerDay || 1;

  const rainNow = weather.rainCurrentMm != null && weather.rainCurrentMm >= rainCurrentThreshold;
  const rainSoon = weather.rainForecastPct != null && weather.rainForecastPct >= rainForecastThreshold;

  if (rainNow) {
    return `Keine Bewässerung geplant – aktueller Regen (${weather.rainCurrentMm}mm) liegt über dem Schwellenwert von ${rainCurrentThreshold}mm.`;
  }
  if (rainSoon) {
    return `Morgenlauf (${morningTime} Uhr) wird ausgesetzt – Regenwahrscheinlichkeit (${weather.rainForecastPct}%) liegt über dem Schwellenwert von ${rainForecastThreshold}%. Bessert sich die Vorhersage im Tagesverlauf, folgt ein Nachtrag; andernfalls prüft ein Abend-Fallback um ${eveningTime} Uhr den tatsächlich gefallenen Regen.`;
  }

  const runs = [`Morgenlauf um ${morningTime} Uhr`];
  if (maxRuns >= 2) runs.push(`Abendlauf um ${eveningTime} Uhr`);
  const rainNowText = weather.rainCurrentMm != null ? `${weather.rainCurrentMm}mm` : 'unbekannt';
  const rainSoonText = weather.rainForecastPct != null ? `${weather.rainForecastPct}%` : 'unbekannt';
  let note = `Bewässerung geplant: ${runs.join(' und ')} – aktueller Regen (${rainNowText}) liegt unter dem Schwellenwert (${rainCurrentThreshold}mm), Regenwahrscheinlichkeit (${rainSoonText}) unter dem Schwellenwert (${rainForecastThreshold}%).`;
  if (maxRuns >= 3) {
    note += ` Zusätzlich eine hitzegetriggerte Zwischenwässerung, sobald ${settings.autoTempThresholdC ?? 28}°C oder ${settings.autoSunThresholdWm2 ?? 600} W/m² überschritten werden.`;
  }
  return note;
}

export default function Dashboard({ status, settings, busy, onStart, onStop, onEmergencyStop }) {
  if (!status) return <div className="loading-state">Lade Status …</div>;

  const totalSec = (settings && settings.cycleDurationSec) || 600;
  const fraction = status.running ? Math.min(1, status.remainingSec / totalSec) : 0;
  const offset = CIRCUMFERENCE * (1 - fraction);

  const zoneNames = status.zoneNames || {};
  const currentZoneName = status.currentZone ? zoneNames[status.currentZone] : null;

  let badge = { cls: 'badge-idle', text: 'Bereit' };
  if (status.emergencyStopped) badge = { cls: 'badge-danger', text: 'Notaus' };
  else if (status.running) badge = { cls: 'badge-running', text: 'Aktiv' };

  return (
    <>
      <h1 className="page-title">Status</h1>

      {status.emergencyStopped && (
        <div className="emergency-banner">
          <WarningIcon />
          <div>
            <strong>Notaus aktiv</strong>
            <p>Alle Läufe gesperrt, bis der Notaus zurückgesetzt wird.</p>
          </div>
        </div>
      )}

      {status.weather && status.weather.stale && (
        <div className="stale-banner">
          <WarningIcon width={18} height={18} />
          Wetterdaten veraltet — Automatik pausiert Auslösungen, bis aktuelle Daten vorliegen.
        </div>
      )}

      <GlassCard>
        <div className="status-hero">
          <div className="status-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle className="status-ring-track" cx="48" cy="48" r={RADIUS} fill="none" strokeWidth="7" />
              {status.running && (
                <circle
                  className="status-ring-progress"
                  cx="48"
                  cy="48"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="7"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                />
              )}
            </svg>
            <div className="status-ring-icon">
              <DropIcon width={30} height={30} />
            </div>
          </div>
          <div className="status-info">
            <span className={`badge ${badge.cls}`}>{badge.text}</span>
            <h2 style={{ marginTop: 8 }}>
              {status.running ? currentZoneName || `Zone ${status.currentZone}` : 'Keine aktive Zone'}
            </h2>
            <p>
              {status.running
                ? `noch ${formatClock(status.remainingSec)} min`
                : status.nextRun
                  ? `Nächster Lauf: ${formatDateTime(status.nextRun)}`
                  : 'Kein Lauf geplant'}
            </p>
          </div>
        </div>

        <div className="action-row">
          {status.running ? (
            <button className="btn btn-danger btn-block" disabled={busy} onClick={onStop}>
              <StopIcon width={18} height={18} />
              Stoppen
            </button>
          ) : (
            <button className="btn btn-primary btn-block" disabled={busy || status.emergencyStopped} onClick={onStart}>
              <PlayIcon width={18} height={18} />
              Manuell starten
            </button>
          )}
          <button
            className={`btn ${status.emergencyStopped ? 'btn-primary' : 'btn-ghost'}`}
            disabled={busy}
            onClick={() => onEmergencyStop(!status.emergencyStopped)}
          >
            {status.emergencyStopped ? 'Notaus lösen' : 'Notaus'}
          </button>
        </div>
      </GlassCard>

      {status.weather && (
        <GlassCard>
          <div className="card-header">
            <span className="card-title">Wetter</span>
          </div>
          <p className="card-sub">Aktuell</p>
          <div className="weather-grid">
            <div className="metric">
              <ThermoIcon />
              <strong>{status.weather.tempCurrentC != null ? `${status.weather.tempCurrentC}°` : '—'}</strong>
              <span>Temperatur</span>
            </div>
            <div className="metric">
              <SunIcon />
              <strong>{status.weather.sunCurrentWm2 != null ? `${status.weather.sunCurrentWm2}` : '—'}</strong>
              <span>W/m²</span>
            </div>
            <div className="metric">
              <RainIcon />
              <strong>{status.weather.rainCurrentMm != null ? `${status.weather.rainCurrentMm}mm` : '—'}</strong>
              <span>Regen aktuell</span>
            </div>
          </div>
          <p className="card-sub" style={{ marginTop: 16 }}>Vorhersage</p>
          <div className="weather-grid-2">
            <div className="metric">
              <RainIcon />
              <strong>{status.weather.rainForecastPct != null ? `${status.weather.rainForecastPct}%` : '—'}</strong>
              <span>Regen morgen</span>
            </div>
            <div className="metric">
              <ThermoIcon />
              <strong>{status.weather.tempForecastMaxC != null ? `${status.weather.tempForecastMaxC}°` : '—'}</strong>
              <span>Max. Temperatur</span>
            </div>
            <div className="metric">
              <RainIcon />
              <strong>{status.weather.rainForecastMm != null ? `${status.weather.rainForecastMm}mm` : '—'}</strong>
              <span>Niederschlag</span>
            </div>
            <div className="metric">
              <SunIcon />
              <strong>{status.weather.sunForecastMJm2 != null ? `${(status.weather.sunForecastMJm2 / 3.6).toFixed(1)}kWh/m²` : '—'}</strong>
              <span>Sonnenstrahlung</span>
            </div>
          </div>
          <p className="weather-note">{buildAutomatikNote(settings, status.weather)}</p>
        </GlassCard>
      )}

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Zonen</span>
          <span className="card-sub">{(status.zones || []).length} gesamt</span>
        </div>
        <div className="zone-list zone-list-compact">
          {(status.zones || []).map((zone) => (
            <div key={zone.index} className={`zone-row ${status.running && status.currentZone === zone.index ? 'is-active' : ''}`}>
              <span className="zone-dot" />
              <span className="zone-name">{zoneNames[zone.index] || `Zone ${zone.index}`}</span>
              <span className="zone-group">{zone.groupName ? zone.groupName.slice(-1) : ''}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {status.lastRunAt && (
        <GlassCard>
          <div className="card-header">
            <span className="card-title">Letzter Lauf</span>
          </div>
          <p className="card-sub">
            {formatDateTime(status.lastRunAt)} · {TRIGGER_LABELS[status.lastRunTrigger] || status.lastRunTrigger}
          </p>
        </GlassCard>
      )}
    </>
  );
}
