import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { WarningIcon } from '../components/icons';
import { api } from '../api';

export default function Settings({ settings, onUpdate, status, onRenameZone }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [zoneDrafts, setZoneDrafts] = useState({});

  if (!settings) return <div className="loading-state">Lade Einstellungen …</div>;

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const { url } = await api.uploadBackgroundImage(file);
      onUpdate({ backgroundImageUrl: url });
    } catch (err) {
      setUploadError(err.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const zones = (status && status.zones) || [];
  const zoneNames = (status && status.zoneNames) || {};

  const maxTotalRuntimeSec = settings.maxTotalRuntimeSec || 5400;
  const estimatedTotalSec = zones.length * (settings.cycleDurationSec || 600);
  const runtimeExceeded = estimatedTotalSec > maxTotalRuntimeSec;

  const commitZoneName = (index) => {
    const draft = zoneDrafts[index];
    if (draft == null) return;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== zoneNames[index]) {
      onRenameZone(index, trimmed);
    }
    setZoneDrafts((d) => {
      const next = { ...d };
      delete next[index];
      return next;
    });
  };

  return (
    <>
      <h1 className="page-title">Einstellungen</h1>

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Hintergrundbild</span>
        </div>
        <div className="bg-upload">
          <div
            className="bg-preview"
            style={settings.backgroundImageUrl ? { backgroundImage: `url(${settings.backgroundImageUrl})` } : undefined}
          />
          <label className="file-input-label">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
            {uploading ? 'Lädt hoch …' : 'Bild wählen'}
          </label>
        </div>
        {uploadError && <p className="field-hint" style={{ color: 'var(--danger)' }}>{uploadError}</p>}

        <div className="field" style={{ marginTop: 20 }}>
          <span className="field-label">Unschärfe</span>
          <input
            type="range"
            className="slider"
            min="0"
            max="40"
            value={settings.backgroundBlurPx ?? 20}
            onChange={(e) => onUpdate({ backgroundBlurPx: Number(e.target.value) }, { debounceMs: 300 })}
          />
          <div className="slider-row">
            <span>scharf</span>
            <span>{settings.backgroundBlurPx ?? 20}px</span>
            <span>weich</span>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Abdunkelung</span>
          <input
            type="range"
            className="slider"
            min="0"
            max="80"
            value={settings.backgroundDimPct ?? 40}
            onChange={(e) => onUpdate({ backgroundDimPct: Number(e.target.value) }, { debounceMs: 300 })}
          />
          <div className="slider-row">
            <span>hell</span>
            <span>{settings.backgroundDimPct ?? 40}%</span>
            <span>dunkel</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Sicherheit</span>
        </div>
        {runtimeExceeded && (
          <div className="stale-banner">
            <WarningIcon width={18} height={18} />
            Geschätzte Gesamtlaufzeit (~{Math.round(estimatedTotalSec / 60)} min bei {zones.length} Zonen) überschreitet den Sicherheits-Timeout — die Bewässerung wird vorzeitig abgebrochen.
          </div>
        )}
        <div className="field">
          <span className="field-label">Sicherheits-Timeout Gesamtlauf</span>
          <input
            type="number"
            className="input"
            min="1"
            max="240"
            value={Math.round(maxTotalRuntimeSec / 60)}
            onChange={(e) => {
              const m = Math.max(1, Number(e.target.value) || 1);
              onUpdate({ maxTotalRuntimeSec: m * 60 }, { debounceMs: 500 });
            }}
          />
          <p className="field-hint">Maximale Gesamtlaufzeit pro Bewässerung — Sicherheitsabschaltung, falls z. B. ein Ventil hängen bleibt.</p>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="card-header">
          <span className="card-title">Zonen umbenennen</span>
        </div>
        <div className="zone-list">
          {zones.map((zone) => (
            <div key={zone.index} className="zone-row">
              <span className="zone-dot" />
              <input
                value={zoneDrafts[zone.index] ?? zoneNames[zone.index] ?? `Zone ${zone.index}`}
                onChange={(e) => setZoneDrafts((d) => ({ ...d, [zone.index]: e.target.value }))}
                onBlur={() => commitZoneName(zone.index)}
              />
              <span style={{ color: 'var(--slate-muted)', fontSize: 12 }}>{zone.groupName}</span>
            </div>
          ))}
          {!zones.length && <p className="empty-state">Keine Zonen gefunden</p>}
        </div>
      </GlassCard>
    </>
  );
}
