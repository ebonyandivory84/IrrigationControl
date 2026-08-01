async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStatus: () => request('/api/status'),
  startManual: () => request('/api/control/start', { method: 'POST' }),
  stopManual: () => request('/api/control/stop', { method: 'POST' }),
  setEmergencyStop: (value) =>
    request('/api/control/emergency-stop', { method: 'POST', body: JSON.stringify({ value }) }),

  getSettings: () => request('/api/settings'),
  updateSettings: (updates) =>
    request('/api/settings', { method: 'POST', body: JSON.stringify(updates) }),

  renameZone: (index, name) =>
    request(`/api/zones/${index}/name`, { method: 'POST', body: JSON.stringify({ name }) }),

  getHistory: () => request('/api/history'),

  uploadBackgroundImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch('/api/background-image', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload fehlgeschlagen');
    return res.json();
  },
};
