import GlassCard from '../components/GlassCard';
import { DropIcon, PlayIcon, StopIcon, WarningIcon, ThermoIcon, SunIcon, RainIcon } from '../components/icons';
import { formatClock, formatDateTime, TRIGGER_LABELS } from '../utils';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
              <strong>{status.weather.rainForecastPct != null ? `${status.weather.rainForecastPct}%` : '—'}</strong>
              <span>Regen morgen</span>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Zonen</span>
          <span className="card-sub">{(status.zones || []).length} gesamt</span>
        </div>
        <div className="zone-list">
          {(status.zones || []).map((zone) => (
            <div key={zone.index} className={`zone-row ${status.running && status.currentZone === zone.index ? 'is-active' : ''}`}>
              <span className="zone-dot" />
              <span>{zoneNames[zone.index] || `Zone ${zone.index}`}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--slate-muted)', fontSize: 12 }}>{zone.groupName}</span>
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
