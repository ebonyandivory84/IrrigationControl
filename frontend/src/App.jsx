import { useCallback, useEffect, useRef, useState } from 'react';
import Background from './components/Background';
import NavBar from './components/NavBar';
import Dashboard from './screens/Dashboard';
import Schedule from './screens/Schedule';
import Automatic from './screens/Automatic';
import Settings from './screens/Settings';
import History from './screens/History';
import { api } from './api';
import './App.css';

const STATUS_POLL_MS = 4000;

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const saveTimers = useRef({});

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.getStatus());
    } catch {
      // stiller Poll-Fehler, nächster Tick versucht erneut
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await api.getSettings());
    } catch {
      // wird beim nächsten Update erneut versucht
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshStatus();
    const id = setInterval(refreshStatus, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [refreshStatus, refreshSettings]);

  const updateSettings = useCallback((patch, { debounceMs = 0 } = {}) => {
    setSettings((prev) => ({ ...(prev || {}), ...patch }));
    const commit = () => api.updateSettings(patch).catch(() => {});
    if (debounceMs > 0) {
      const timerKey = Object.keys(patch).join(',');
      clearTimeout(saveTimers.current[timerKey]);
      saveTimers.current[timerKey] = setTimeout(commit, debounceMs);
    } else {
      commit();
    }
  }, []);

  const handleStart = async () => {
    setBusy(true);
    try {
      await api.startManual();
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await api.stopManual();
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleEmergencyStop = async (value) => {
    setBusy(true);
    try {
      await api.setEmergencyStop(value);
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleRenameZone = async (index, name) => {
    try {
      await api.renameZone(index, name);
      await refreshStatus();
    } catch {
      // Name wird beim nächsten Status-Poll wiederhergestellt
    }
  };

  return (
    <div className="app-shell">
      <Background
        imageUrl={settings ? settings.backgroundImageUrl : ''}
        blurPx={settings && settings.backgroundBlurPx != null ? settings.backgroundBlurPx : 20}
        dimPct={settings && settings.backgroundDimPct != null ? settings.backgroundDimPct : 40}
      />
      <NavBar active={tab} onChange={setTab} />
      <main className="app-main">
        {tab === 'dashboard' && (
          <Dashboard
            status={status}
            settings={settings}
            busy={busy}
            onStart={handleStart}
            onStop={handleStop}
            onEmergencyStop={handleEmergencyStop}
          />
        )}
        {tab === 'schedule' && <Schedule settings={settings} onUpdate={updateSettings} status={status} />}
        {tab === 'automatic' && <Automatic settings={settings} onUpdate={updateSettings} status={status} />}
        {tab === 'settings' && (
          <Settings settings={settings} onUpdate={updateSettings} status={status} onRenameZone={handleRenameZone} />
        )}
        {tab === 'history' && <History />}
      </main>
    </div>
  );
}
