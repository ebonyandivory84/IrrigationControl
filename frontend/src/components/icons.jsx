const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const DropIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2.5c3.2 4.2 6.5 8.4 6.5 12.2A6.5 6.5 0 1 1 5.5 14.7C5.5 10.9 8.8 6.7 12 2.5Z" />
  </svg>
);

export const DashboardIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </svg>
);

export const ScheduleIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);

export const AutoIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

export const SettingsIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 3h-6l-.3 2.5a8 8 0 0 0-1.7 1l-2.4-1-2 3.5L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1L9 21h6l.3-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5Z" />
  </svg>
);

export const HistoryIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4h4" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const PlayIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const StopIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </svg>
);

export const WarningIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const SunIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v3M12 18.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </svg>
);

export const RainIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 15a4.5 4.5 0 0 1 .5-9A6 6 0 0 1 19 9a4 4 0 0 1-1 8H7Z" />
    <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
  </svg>
);

export const ThermoIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 14.5V4a2 2 0 1 0-4 0v10.5a4 4 0 1 0 4 0Z" />
  </svg>
);
