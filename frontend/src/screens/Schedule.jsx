import GlassCard from '../components/GlassCard';

const WEEKDAYS = [
  { key: 'Monday', label: 'Mo' },
  { key: 'Tuesday', label: 'Di' },
  { key: 'Wednesday', label: 'Mi' },
  { key: 'Thursday', label: 'Do' },
  { key: 'Friday', label: 'Fr' },
  { key: 'Saturday', label: 'Sa' },
  { key: 'Sunday', label: 'So' },
];

export default function Schedule({ settings, onUpdate }) {
  if (!settings) return <div className="loading-state">Lade Einstellungen …</div>;

  const minutes = Math.round((settings.cycleDurationSec || 600) / 60);

  return (
    <>
      <h1 className="page-title">Zeitplan</h1>

      {settings.automaticMode && (
        <div className="stale-banner">
          Automatik-Modus ist aktiv — der Zeitplan wird derzeit ignoriert.
        </div>
      )}

      <GlassCard>
        <div className="field-row">
          <div>
            <div className="card-title">Zeitplan aktiv</div>
            <p className="card-sub">Ohne diesen Schalter läuft nichts automatisch</p>
          </div>
          <button
            type="button"
            className={`toggle ${settings.scheduleEnabled ? 'is-on' : ''}`}
            onClick={() => onUpdate({ scheduleEnabled: !settings.scheduleEnabled })}
            aria-pressed={!!settings.scheduleEnabled}
          />
        </div>
      </GlassCard>

      <GlassCard className={settings.scheduleEnabled ? '' : 'is-disabled'} style={settings.scheduleEnabled ? {} : { opacity: 0.5, pointerEvents: 'none' }}>
        <div className="field">
          <span className="field-label">Wochentage</span>
          <div className="weekday-picker">
            {WEEKDAYS.map(({ key, label }) => {
              const settingsKey = `weekday${key}`;
              const active = !!settings[settingsKey];
              return (
                <button
                  key={key}
                  type="button"
                  className={`weekday-btn ${active ? 'is-active' : ''}`}
                  onClick={() => onUpdate({ [settingsKey]: !active })}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Startzeit</span>
          <input
            type="time"
            className="input"
            value={settings.startTime || '05:00'}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
          />
        </div>

        <div className="field">
          <span className="field-label">Zyklusdauer pro Zone</span>
          <input
            type="number"
            className="input"
            min="1"
            max="120"
            value={minutes}
            onChange={(e) => {
              const m = Math.max(1, Number(e.target.value) || 1);
              onUpdate({ cycleDurationSec: m * 60 }, { debounceMs: 500 });
            }}
          />
          <p className="field-hint">Minuten je Zone — gilt für alle Zonen gleich, um die Verteiler nicht zu desynchronisieren.</p>
        </div>
      </GlassCard>
    </>
  );
}
