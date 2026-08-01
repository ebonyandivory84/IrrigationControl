'use strict';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULTS = {
    'settings.startTime': '05:00',
    'settings.cycleDurationSec': 600,
    'settings.automaticMode': false,
    'settings.autoTempThresholdC': 28,
    'settings.autoSunThresholdWm2': 600,
    'settings.autoRainCurrentThresholdMm': 0.15,
    'settings.autoRainForecastThresholdPct': 50,
    'settings.autoMaxRunsPerDay': 1,
    'settings.autoMorningTime': '05:00',
    'settings.autoEveningTime': '17:00',
    'settings.backgroundImageUrl': '',
    'settings.backgroundBlurPx': 20,
    'settings.backgroundDimPct': 40
};

class Scheduler {
    constructor(adapter, engine, weather, history) {
        this.adapter = adapter;
        this.engine = engine;
        this.weather = weather;
        this.history = history;
    }

    async init() {
        for (const day of WEEKDAY_NAMES) {
            await this._ensureState(`settings.weekday${day}`, { type: 'boolean', role: 'switch', read: true, write: true }, true);
        }
        await this._ensureState('settings.startTime', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.startTime']);
        await this._ensureState('settings.cycleDurationSec', { type: 'number', role: 'value.interval', read: true, write: true }, DEFAULTS['settings.cycleDurationSec']);
        await this._ensureState('settings.automaticMode', { type: 'boolean', role: 'switch', read: true, write: true }, DEFAULTS['settings.automaticMode']);
        await this._ensureState('settings.autoTempThresholdC', { type: 'number', role: 'value.temperature', read: true, write: true }, DEFAULTS['settings.autoTempThresholdC']);
        await this._ensureState('settings.autoSunThresholdWm2', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoSunThresholdWm2']);
        await this._ensureState('settings.autoRainCurrentThresholdMm', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoRainCurrentThresholdMm']);
        await this._ensureState('settings.autoRainForecastThresholdPct', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoRainForecastThresholdPct']);
        await this._ensureState('settings.autoMaxRunsPerDay', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoMaxRunsPerDay']);
        await this._ensureState('settings.autoMorningTime', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.autoMorningTime']);
        await this._ensureState('settings.autoEveningTime', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.autoEveningTime']);
        await this._ensureState('settings.backgroundImageUrl', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.backgroundImageUrl']);
        await this._ensureState('settings.backgroundImageFileName', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('settings.backgroundBlurPx', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.backgroundBlurPx']);
        await this._ensureState('settings.backgroundDimPct', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.backgroundDimPct']);

        await this._ensureState('status.lastScheduleRunDate', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.autoMorningHandledDate', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.autoEveningHandledDate', { type: 'string', role: 'text', read: true, write: false }, '');
    }

    async _ensureState(id, common, initialVal) {
        const obj = await this.adapter.getObjectAsync(id);
        if (!obj) {
            await this.adapter.setObjectNotExistsAsync(id, { type: 'state', common: { name: id, ...common }, native: {} });
            await this.adapter.setStateAsync(id, initialVal, true);
        }
    }

    async _getBool(id, fallback) {
        const s = await this.adapter.getStateAsync(id);
        return s ? !!s.val : fallback;
    }

    async _getStr(id, fallback) {
        const s = await this.adapter.getStateAsync(id);
        return s && s.val != null ? String(s.val) : fallback;
    }

    async _getNum(id, fallback) {
        const s = await this.adapter.getStateAsync(id);
        return s && s.val != null ? Number(s.val) : fallback;
    }

    _timeReached(now, hhmm) {
        const [h, m] = String(hhmm).split(':').map(Number);
        return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
    }

    async tick() {
        if (this.engine.emergencyStopped || this.engine.running) return;
        const automatic = await this._getBool('settings.automaticMode', false);
        if (automatic) {
            await this._tickAutomatic();
        } else {
            await this._tickSchedule();
        }
    }

    async _tickSchedule() {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const weekday = WEEKDAY_NAMES[now.getDay()];
        const enabled = await this._getBool(`settings.weekday${weekday}`, true);
        const startTime = await this._getStr('settings.startTime', DEFAULTS['settings.startTime']);
        const lastRunDate = await this._getStr('status.lastScheduleRunDate', '');

        if (!enabled || lastRunDate === todayStr) return;
        if (!this._timeReached(now, startTime)) return;

        await this.adapter.setStateAsync('status.lastScheduleRunDate', todayStr, true);
        this.engine.runFullCycle('schedule').catch((e) => this.adapter.log.error(`Zeitplan-Lauf fehlgeschlagen: ${e.message}`));
    }

    async _tickAutomatic() {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const maxRuns = await this._getNum('settings.autoMaxRunsPerDay', 1);
        const morningTime = await this._getStr('settings.autoMorningTime', DEFAULTS['settings.autoMorningTime']);
        const eveningTime = await this._getStr('settings.autoEveningTime', DEFAULTS['settings.autoEveningTime']);
        const morningHandled = await this._getStr('status.autoMorningHandledDate', '');
        const eveningHandled = await this._getStr('status.autoEveningHandledDate', '');

        if (morningHandled !== todayStr && this._timeReached(now, morningTime)) {
            await this.adapter.setStateAsync('status.autoMorningHandledDate', todayStr, true);
            await this._evaluateAndMaybeRun('auto');
        }

        if (maxRuns >= 2 && eveningHandled !== todayStr && this._timeReached(now, eveningTime)) {
            await this.adapter.setStateAsync('status.autoEveningHandledDate', todayStr, true);
            const weather = await this.weather.getWeather();
            const tempThreshold = await this._getNum('settings.autoTempThresholdC', DEFAULTS['settings.autoTempThresholdC']);
            const sunThreshold = await this._getNum('settings.autoSunThresholdWm2', DEFAULTS['settings.autoSunThresholdWm2']);
            const hot = (weather.tempCurrentC != null && weather.tempCurrentC >= tempThreshold) ||
                        (weather.sunCurrentWm2 != null && weather.sunCurrentWm2 >= sunThreshold);
            if (hot) {
                await this._evaluateAndMaybeRun('auto');
            } else {
                this.adapter.log.debug('Automatik: Zusatzlauf abends übersprungen (kein Hitze-/Sonnentrigger)');
            }
        }
    }

    async computeNextRun() {
        const automatic = await this._getBool('settings.automaticMode', false);
        const now = new Date();
        if (automatic) {
            const maxRuns = await this._getNum('settings.autoMaxRunsPerDay', 1);
            const morningTime = await this._getStr('settings.autoMorningTime', DEFAULTS['settings.autoMorningTime']);
            const eveningTime = await this._getStr('settings.autoEveningTime', DEFAULTS['settings.autoEveningTime']);
            const candidates = [morningTime];
            if (maxRuns >= 2) candidates.push(eveningTime);
            return this._nextOccurrence(now, candidates, null);
        }
        const startTime = await this._getStr('settings.startTime', DEFAULTS['settings.startTime']);
        const enabledDays = [];
        for (let i = 0; i < 7; i++) {
            const day = WEEKDAY_NAMES[i];
            if (await this._getBool(`settings.weekday${day}`, true)) enabledDays.push(i);
        }
        if (!enabledDays.length) return '';
        return this._nextOccurrence(now, [startTime], enabledDays);
    }

    _nextOccurrence(now, timeCandidates, allowedWeekdays) {
        for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
            const candidateDate = new Date(now);
            candidateDate.setDate(candidateDate.getDate() + dayOffset);
            if (allowedWeekdays && !allowedWeekdays.includes(candidateDate.getDay())) continue;
            for (const t of timeCandidates) {
                const [h, m] = String(t).split(':').map(Number);
                const candidate = new Date(candidateDate);
                candidate.setHours(h, m, 0, 0);
                if (candidate > now) return candidate.toISOString();
            }
        }
        return '';
    }

    async _evaluateAndMaybeRun(trigger) {
        const weather = await this.weather.getWeather();
        const timestamp = new Date().toISOString();

        if (weather.stale) {
            this.adapter.log.warn('Automatik übersprungen — Wetterdaten veraltet');
            await this.history.addEntry({ timestamp, trigger, skipped: true, reason: 'Wetterdaten veraltet' });
            return;
        }

        const rainCurrentThreshold = await this._getNum('settings.autoRainCurrentThresholdMm', DEFAULTS['settings.autoRainCurrentThresholdMm']);
        if (weather.rainCurrentMm != null && weather.rainCurrentMm >= rainCurrentThreshold) {
            await this.history.addEntry({ timestamp, trigger, skipped: true, reason: `Regen aktuell (${weather.rainCurrentMm}mm)` });
            return;
        }

        const rainForecastThreshold = await this._getNum('settings.autoRainForecastThresholdPct', DEFAULTS['settings.autoRainForecastThresholdPct']);
        if (weather.rainForecastPct != null && weather.rainForecastPct >= rainForecastThreshold) {
            await this.history.addEntry({ timestamp, trigger, skipped: true, reason: `Regenwahrscheinlichkeit ${weather.rainForecastPct}%` });
            return;
        }

        this.engine.runFullCycle(trigger).catch((e) => this.adapter.log.error(`Automatik-Lauf fehlgeschlagen: ${e.message}`));
    }
}

module.exports = { Scheduler };
