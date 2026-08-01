export function formatClock(totalSec) {
  const sec = Math.max(0, Math.round(totalSec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `heute, ${time}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `morgen, ${time}`;
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `${date}, ${time}`;
}

export const TRIGGER_LABELS = {
  manual: 'Manuell',
  schedule: 'Zeitplan',
  auto: 'Automatik',
};
