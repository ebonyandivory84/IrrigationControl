import { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { DropIcon, WarningIcon } from '../components/icons';
import { api } from '../api';
import { formatDateTime, TRIGGER_LABELS } from '../utils';

export default function History() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getHistory()
      .then(setEntries)
      .catch((e) => setError(e.message || 'Verlauf konnte nicht geladen werden'));
  }, []);

  return (
    <>
      <h1 className="page-title">Verlauf</h1>
      <GlassCard>
        {error && <p className="empty-state">{error}</p>}
        {!error && entries === null && <p className="loading-state">Lade Verlauf …</p>}
        {!error && entries && entries.length === 0 && <p className="empty-state">Noch keine Läufe protokolliert</p>}
        {!error && entries && entries.length > 0 && (
          <div>
            {entries.map((entry, i) => {
              const isProblem = entry.skipped || entry.aborted;
              return (
                <div className="history-row" key={i}>
                  <div className={`history-icon ${isProblem ? 'is-error' : ''}`}>
                    {isProblem ? <WarningIcon width={16} height={16} /> : <DropIcon width={16} height={16} />}
                  </div>
                  <div className="history-main">
                    <strong>
                      {TRIGGER_LABELS[entry.trigger] || entry.trigger}
                      {entry.skipped && ' — übersprungen'}
                      {entry.aborted && !entry.skipped && ' — abgebrochen'}
                    </strong>
                    <span>
                      {entry.skipped
                        ? entry.reason
                        : `${entry.zonesCompleted}/${entry.zonesPlanned} Zonen`}
                    </span>
                  </div>
                  <span className="history-time">{formatDateTime(entry.timestamp)}</span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </>
  );
}
