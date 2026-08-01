import GlassCard from '../components/GlassCard';

export default function Automatic({ settings, onUpdate }) {
  if (!settings) return <div className="loading-state">Lade Einstellungen …</div>;

  const maxRuns = settings.autoMaxRunsPerDay || 1;
  const cycleMinutes = Math.round((settings.cycleDurationSec || 600) / 60);

  return (
    <>
      <h1 className="page-title">Automatik</h1>

      <GlassCard>
        <div className="field-row">
          <div>
            <div className="card-title">Automatik-Modus</div>
            <p className="card-sub">Ersetzt den Zeitplan, wenn aktiv</p>
          </div>
          <button
            type="button"
            className={`toggle ${settings.automaticMode ? 'is-on' : ''}`}
            onClick={() => onUpdate({ automaticMode: !settings.automaticMode })}
            aria-pressed={!!settings.automaticMode}
          />
        </div>
      </GlassCard>

      <GlassCard className={settings.automaticMode ? '' : 'is-disabled'} style={settings.automaticMode ? {} : { opacity: 0.5, pointerEvents: 'none' }}>
        <div className="card-header">
          <span className="card-title">Auslöse-Schwellen</span>
        </div>
        <div className="threshold-grid">
          <div className="field">
            <span className="field-label">Temperatur ab</span>
            <input
              type="range"
              className="slider"
              min="15"
              max="40"
              value={settings.autoTempThresholdC ?? 28}
              onChange={(e) => onUpdate({ autoTempThresholdC: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>15°C</span>
              <span>{settings.autoTempThresholdC ?? 28}°C</span>
              <span>40°C</span>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Sonneneinstrahlung ab</span>
            <input
              type="range"
              className="slider"
              min="200"
              max="1000"
              step="10"
              value={settings.autoSunThresholdWm2 ?? 600}
              onChange={(e) => onUpdate({ autoSunThresholdWm2: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>200</span>
              <span>{settings.autoSunThresholdWm2 ?? 600} W/m²</span>
              <span>1000</span>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Kein Lauf bei aktuellem Regen ab</span>
            <input
              type="range"
              className="slider"
              min="0"
              max="2"
              step="0.05"
              value={settings.autoRainCurrentThresholdMm ?? 0.15}
              onChange={(e) => onUpdate({ autoRainCurrentThresholdMm: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>0 mm</span>
              <span>{(settings.autoRainCurrentThresholdMm ?? 0.15).toFixed(2)} mm</span>
              <span>2 mm</span>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Kein Lauf bei Regenwahrscheinlichkeit ab</span>
            <input
              type="range"
              className="slider"
              min="0"
              max="100"
              step="5"
              value={settings.autoRainForecastThresholdPct ?? 50}
              onChange={(e) => onUpdate({ autoRainForecastThresholdPct: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>0%</span>
              <span>{settings.autoRainForecastThresholdPct ?? 50}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Häufigkeit</span>
        </div>
        <div className="field">
          <span className="field-label">Läufe pro Tag</span>
          <div className="weekday-picker" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`weekday-btn ${maxRuns === n ? 'is-active' : ''}`}
                style={{ aspectRatio: 'auto', padding: '11px 0' }}
                onClick={() => onUpdate({ autoMaxRunsPerDay: n })}
              >
                {n}×
              </button>
            ))}
          </div>
          {maxRuns >= 3 && <p className="field-hint">Dritter Lauf: einmalige Zwischenwässerung tagsüber, sobald die oben eingestellte Hitze-/Sonnenschwelle erreicht wird.</p>}
        </div>

        <div className="field">
          <span className="field-label">Morgens</span>
          <input
            type="time"
            className="input"
            value={settings.autoMorningTime || '04:00'}
            onChange={(e) => onUpdate({ autoMorningTime: e.target.value })}
          />
        </div>

        <div className="field">
          <span className="field-label">Abends</span>
          <input
            type="time"
            className="input"
            value={settings.autoEveningTime || '22:00'}
            onChange={(e) => onUpdate({ autoEveningTime: e.target.value })}
          />
          <p className="field-hint">
            {maxRuns >= 2
              ? 'Läuft immer regulär bei 2+ Läufen/Tag; springt zusätzlich ein, falls morgens wegen Regenmeldung ausgesetzt wurde, es bis dahin aber tatsächlich nicht geregnet hat.'
              : 'Regen-Fallback: Wenn morgens wegen Regenmeldung ausgesetzt wurde, es bis dahin aber tatsächlich nicht geregnet hat, wird zu dieser Zeit trotzdem gewässert.'}
          </p>
        </div>

        <div className="field">
          <span className="field-label">Zyklusdauer pro Zone</span>
          <input
            type="number"
            className="input"
            min="1"
            max="120"
            value={cycleMinutes}
            onChange={(e) => {
              const m = Math.max(1, Number(e.target.value) || 1);
              onUpdate({ cycleDurationSec: m * 60 }, { debounceMs: 500 });
            }}
          />
          <p className="field-hint">Minuten je Zone — globale Einstellung, gilt auch für den Zeitplan-Modus.</p>
        </div>
      </GlassCard>
    </>
  );
}
