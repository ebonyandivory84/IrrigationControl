import { DashboardIcon, ScheduleIcon, AutoIcon, SettingsIcon, HistoryIcon, DropIcon } from './icons';

const TABS = [
  { id: 'dashboard', label: 'Status', Icon: DashboardIcon },
  { id: 'schedule', label: 'Zeitplan', Icon: ScheduleIcon },
  { id: 'automatic', label: 'Automatik', Icon: AutoIcon },
  { id: 'settings', label: 'Einstellungen', Icon: SettingsIcon },
  { id: 'history', label: 'Verlauf', Icon: HistoryIcon },
];

export default function NavBar({ active, onChange }) {
  return (
    <nav className="nav-bar glass-panel">
      <div className="nav-brand">
        <DropIcon />
        <span>Bewässerung</span>
      </div>
      <div className="nav-items">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${active === id ? 'is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
