import GlassCard from '../components/GlassCard';
import { WarningIcon } from '../components/icons';

const RUN_LABELS = {
  morning: 'Morgenlauf (1x)',
  evening: 'Abendlauf (2x)',
  interim: 'Zwischenwässerung (3x)'
};

// Vergleicht die Auslöse-Schwellen zweier aktivierter Läufe und warnt, wenn der spätere
// Lauf leichter auslöst als der frühere (widersprüchliche Konfiguration).
function buildThresholdWarnings(settings) {
  if (!settings) return [];
  const warnings = [];

  const morningEnabled = !!settings.autoMorningEnabled;
  const eveningEnabled = !!settings.autoEveningEnabled;
  const interimEnabled = !!settings.autoInterimEnabled;

  const compareRun = (fromKey, toKey, fields) => {
    if (fromKey === 'morning' && !morningEnabled) return;
    if (fromKey === 'evening' && !eveningEnabled) return;
    if (toKey === 'evening' && !eveningEnabled) return;
    if (toKey === 'interim' && !interimEnabled) return;

    const fromLabel = RUN_LABELS[fromKey];
    const toLabel = RUN_LABELS[toKey];

    const allEqual = fields.every((f) => {
      const a = settings[`auto${cap(fromKey)}${f.key}`] ?? f.default;
      const b = settings[`auto${cap(toKey)}${f.key}`] ?? f.default;
      return a === b;
    });

    if (allEqual) {
      warnings.push(`${fromLabel} und ${toLabel} haben identische Auslöse-Schwellen — vermutlich ein Konfigurationsfehler.`);
      return;
    }

    for (const f of fields) {
      const a = settings[`auto${cap(fromKey)}${f.key}`] ?? f.default;
      const b = settings[`auto${cap(toKey)}${f.key}`] ?? f.default;
      if (a === b) continue;
      const easier = f.lowerIsEasier ? b < a : b > a;
      if (easier) {
        warnings.push(`${toLabel} hat ${f.easierText} als ${fromLabel} — ${toLabel} würde leichter auslösen als ${fromLabel}.`);
      }
    }
  };

  // Morgen → Abend: Temp, Sonne (beide MJ/m² Vorhersage), RainCurrent, RainForecast
  compareRun('morning', 'evening', [
    { key: 'TempThresholdC', default: 10, lowerIsEasier: true, easierText: 'eine niedrigere Temperaturschwelle' },
    { key: 'SunThresholdMJm2', default: 5, lowerIsEasier: true, easierText: 'eine niedrigere Sonnenschwelle' },
    { key: 'RainCurrentThresholdMm', default: 0.15, lowerIsEasier: false, easierText: 'eine höhere Regen-Toleranz (aktuell)' },
    { key: 'RainForecastThresholdPct', default: 50, lowerIsEasier: false, easierText: 'eine höhere Regen-Toleranz (Vorhersage)' }
  ]);

  // Abend → Zwischenwässerung: nur Temp, RainCurrent, RainForecast (Sonne unterschiedliche Basis: MJ/m² Vorhersage vs. W/m² aktuell)
  compareRun('evening', 'interim', [
    { key: 'TempThresholdC', default: 25, lowerIsEasier: true, easierText: 'eine niedrigere Temperaturschwelle' },
    { key: 'RainCurrentThresholdMm', default: 0.1, lowerIsEasier: false, easierText: 'eine höhere Regen-Toleranz (aktuell)' },
    { key: 'RainForecastThresholdPct', default: 40, lowerIsEasier: false, easierText: 'eine höhere Regen-Toleranz (Vorhersage)' }
  ]);

  return warnings;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Automatic({ settings, onUpdate, status }) {
  if (!settings) return <div className="loading-state">Lade Einstellungen …</div>;

  const cycleMinutes = Math.round((settings.cycleDurationSec || 600) / 60);

  const zones = (status && status.zones) || [];
  const maxTotalRuntimeSec = settings.maxTotalRuntimeSec || 5400;
  const estimatedTotalSec = zones.length * (settings.cycleDurationSec || 600);
  const runtimeExceeded = zones.length > 0 && estimatedTotalSec > maxTotalRuntimeSec;

  const thresholdWarnings = buildThresholdWarnings(settings);

  return (
    <>
      <h1 className="page-title">Automatik</h1>

      {runtimeExceeded && (
        <div className="stale-banner">
          <WarningIcon width={18} height={18} />
          Geschätzte Gesamtlaufzeit (~{Math.round(estimatedTotalSec / 60)} min bei {zones.length} Zonen) überschreitet den Sicherheits-Timeout — die Bewässerung wird vorzeitig abgebrochen.
        </div>
      )}

      {thresholdWarnings.map((w, i) => (
        <div className="stale-banner" key={i}>
          <WarningIcon width={18} height={18} />
          {w}
        </div>
      ))}

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

      <RunCard
        title="Morgenlauf (1x)"
        enabledKey="autoMorningEnabled"
        settings={settings}
        onUpdate={onUpdate}
        automaticMode={settings.automaticMode}
        sunUnit="kWh"
        tempLabel="Temperatur ab (Tagesmax. Vorhersage)"
        sunLabel="Sonneneinstrahlung ab (Tagessumme Vorhersage)"
        prefix="Morning"
        timeKey="autoMorningTime"
        timeLabel="Morgens"
        timeDefault="04:00"
      />

      <RunCard
        title="Abendlauf (2x)"
        enabledKey="autoEveningEnabled"
        settings={settings}
        onUpdate={onUpdate}
        automaticMode={settings.automaticMode}
        sunUnit="kWh"
        tempLabel="Temperatur ab (Tagesmax. Vorhersage)"
        sunLabel="Sonneneinstrahlung ab (Tagessumme Vorhersage)"
        prefix="Evening"
        timeKey="autoEveningTime"
        timeLabel="Abends"
        timeDefault="22:00"
      />

      <RunCard
        title="Zwischenwässerung (3x)"
        enabledKey="autoInterimEnabled"
        settings={settings}
        onUpdate={onUpdate}
        automaticMode={settings.automaticMode}
        sunUnit="Wm2"
        tempLabel="Temperatur ab (aktuell)"
        sunLabel="Sonneneinstrahlung ab (aktuell)"
        prefix="Interim"
        hint="Einmalige Zwischenwässerung tagsüber, sobald die Hitze-/Sonnenschwelle erreicht wird."
      />

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Zyklusdauer</span>
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

function RunCard({ title, enabledKey, settings, onUpdate, automaticMode, sunUnit, tempLabel, sunLabel, prefix, timeKey, timeLabel, timeDefault, hint }) {
  const enabled = !!settings[enabledKey];
  const cardDisabled = !automaticMode;

  const tempKey = `auto${prefix}TempThresholdC`;
  const tempDefault = prefix === 'Morning' ? 10 : prefix === 'Evening' ? 25 : 28;

  const rainCurrentKey = `auto${prefix}RainCurrentThresholdMm`;
  const rainCurrentDefault = prefix === 'Morning' ? 0.15 : prefix === 'Evening' ? 0.1 : 0.05;

  const rainForecastKey = `auto${prefix}RainForecastThresholdPct`;
  const rainForecastDefault = prefix === 'Morning' ? 50 : prefix === 'Evening' ? 40 : 30;

  return (
    <GlassCard className={cardDisabled ? 'is-disabled' : ''} style={cardDisabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        <button
          type="button"
          className={`toggle ${enabled ? 'is-on' : ''}`}
          onClick={() => onUpdate({ [enabledKey]: !enabled })}
          aria-pressed={enabled}
        />
      </div>

      <div className={enabled ? '' : 'is-disabled'} style={enabled ? {} : { opacity: 0.5, pointerEvents: 'none' }}>
        <div className="threshold-grid">
          <div className="field">
            <span className="field-label">{tempLabel}</span>
            <input
              type="range"
              className="slider"
              min="15"
              max="40"
              value={settings[tempKey] ?? tempDefault}
              onChange={(e) => onUpdate({ [tempKey]: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>15°C</span>
              <span>{settings[tempKey] ?? tempDefault}°C</span>
              <span>40°C</span>
            </div>
          </div>

          {sunUnit === 'kWh' ? (
            <SunFieldMJ prefix={prefix} label={sunLabel} settings={settings} onUpdate={onUpdate} />
          ) : (
            <SunFieldWm2 prefix={prefix} label={sunLabel} settings={settings} onUpdate={onUpdate} />
          )}

          <div className="field">
            <span className="field-label">Kein Lauf bei aktuellem Regen ab</span>
            <input
              type="range"
              className="slider"
              min="0"
              max="2"
              step="0.05"
              value={settings[rainCurrentKey] ?? rainCurrentDefault}
              onChange={(e) => onUpdate({ [rainCurrentKey]: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>0 mm</span>
              <span>{(settings[rainCurrentKey] ?? rainCurrentDefault).toFixed(2)} mm</span>
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
              value={settings[rainForecastKey] ?? rainForecastDefault}
              onChange={(e) => onUpdate({ [rainForecastKey]: Number(e.target.value) }, { debounceMs: 400 })}
            />
            <div className="slider-row">
              <span>0%</span>
              <span>{settings[rainForecastKey] ?? rainForecastDefault}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {timeKey && (
          <div className="field">
            <span className="field-label">{timeLabel}</span>
            <input
              type="time"
              className="input"
              value={settings[timeKey] || timeDefault}
              onChange={(e) => onUpdate({ [timeKey]: e.target.value })}
            />
          </div>
        )}

        {hint && <p className="field-hint">{hint}</p>}
      </div>
    </GlassCard>
  );
}

function SunFieldMJ({ prefix, label, settings, onUpdate }) {
  const key = `auto${prefix}SunThresholdMJm2`;
  const mjDefault = prefix === 'Morning' ? 5 : 15;
  const mj = settings[key] ?? mjDefault;
  const kwh = mj / 3.6;

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <input
        type="range"
        className="slider"
        min="0"
        max="10"
        step="0.5"
        value={kwh}
        onChange={(e) => onUpdate({ [key]: Number(e.target.value) * 3.6 }, { debounceMs: 400 })}
      />
      <div className="slider-row">
        <span>0 kWh/m²</span>
        <span>{kwh.toFixed(1)} kWh/m²</span>
        <span>10 kWh/m²</span>
      </div>
    </div>
  );
}

function SunFieldWm2({ prefix, label, settings, onUpdate }) {
  const key = `auto${prefix}SunThresholdWm2`;
  const value = settings[key] ?? 600;

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <input
        type="range"
        className="slider"
        min="200"
        max="1000"
        step="10"
        value={value}
        onChange={(e) => onUpdate({ [key]: Number(e.target.value) }, { debounceMs: 400 })}
      />
      <div className="slider-row">
        <span>200</span>
        <span>{value} W/m²</span>
        <span>1000</span>
      </div>
    </div>
  );
}
