'use strict';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULTS = {
    'settings.scheduleEnabled': false,
    'settings.startTime': '05:00',
    'settings.cycleDurationSec': 600,
    'settings.automaticMode': false,
    'settings.autoMorningEnabled': true,
    'settings.autoMorningTempThresholdC': 10,
    'settings.autoMorningSunThresholdMJm2': 5,
    'settings.autoMorningRainCurrentThresholdMm': 0.15,
    'settings.autoMorningRainForecastThresholdPct': 50,
    'settings.autoMorningTime': '04:00',
    'settings.autoEveningEnabled': false,
    'settings.autoEveningTempThresholdC': 25,
    'settings.autoEveningSunThresholdMJm2': 15,
    'settings.autoEveningRainCurrentThresholdMm': 0.10,
    'settings.autoEveningRainForecastThresholdPct': 40,
    'settings.autoEveningTime': '22:00',
    'settings.autoInterimEnabled': false,
    'settings.autoInterimTempThresholdC': 28,
    'settings.autoInterimSunThresholdWm2': 600,
    'settings.autoInterimRainCurrentThresholdMm': 0.05,
    'settings.autoInterimRainForecastThresholdPct': 30,
    'settings.maxTotalRuntimeSec': 5400,
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
        await this._ensureState('settings.scheduleEnabled', { type: 'boolean', role: 'switch', read: true, write: true }, DEFAULTS['settings.scheduleEnabled']);
        for (const day of WEEKDAY_NAMES) {
            await this._ensureState(`settings.weekday${day}`, { type: 'boolean', role: 'switch', read: true, write: true }, true);
        }
        await this._ensureState('settings.startTime', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.startTime']);
        await this._ensureState('settings.cycleDurationSec', { type: 'number', role: 'value.interval', read: true, write: true }, DEFAULTS['settings.cycleDurationSec']);
        await this._ensureState('settings.automaticMode', { type: 'boolean', role: 'switch', read: true, write: true }, DEFAULTS['settings.automaticMode']);

        // Morgenlauf (1x)
        await this._ensureState('settings.autoMorningEnabled', { type: 'boolean', role: 'switch', read: true, write: true }, DEFAULTS['settings.autoMorningEnabled']);
        await this._ensureState('settings.autoMorningTempThresholdC', { type: 'number', role: 'value.temperature', read: true, write: true }, DEFAULTS['settings.autoMorningTempThresholdC']);
        await this._ensureState('settings.autoMorningSunThresholdMJm2', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoMorningSunThresholdMJm2']);
        await this._ensureState('settings.autoMorningRainCurrentThresholdMm', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoMorningRainCurrentThresholdMm']);
        await this._ensureState('settings.autoMorningRainForecastThresholdPct', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoMorningRainForecastThresholdPct']);
        await this._ensureState('settings.autoMorningTime', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.autoMorningTime']);

        // Abendlauf (2x)
        await this._ensureState('settings.autoEveningEnabled', { type: 'boolean', role: 'switch', read: true, write: true }, DEFAULTS['settings.autoEveningEnabled']);
        await this._ensureState('settings.autoEveningTempThresholdC', { type: 'number', role: 'value.temperature', read: true, write: true }, DEFAULTS['settings.autoEveningTempThresholdC']);
        await this._ensureState('settings.autoEveningSunThresholdMJm2', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoEveningSunThresholdMJm2']);
        await this._ensureState('settings.autoEveningRainCurrentThresholdMm', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoEveningRainCurrentThresholdMm']);
        await this._ensureState('settings.autoEveningRainForecastThresholdPct', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoEveningRainForecastThresholdPct']);
        await this._ensureState('settings.autoEveningTime', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.autoEveningTime']);

        // Zwischenwässerung (3x)
        await this._ensureState('settings.autoInterimEnabled', { type: 'boolean', role: 'switch', read: true, write: true }, DEFAULTS['settings.autoInterimEnabled']);
        await this._ensureState('settings.autoInterimTempThresholdC', { type: 'number', role: 'value.temperature', read: true, write: true }, DEFAULTS['settings.autoInterimTempThresholdC']);
        await this._ensureState('settings.autoInterimSunThresholdWm2', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoInterimSunThresholdWm2']);
        await this._ensureState('settings.autoInterimRainCurrentThresholdMm', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoInterimRainCurrentThresholdMm']);
        await this._ensureState('settings.autoInterimRainForecastThresholdPct', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.autoInterimRainForecastThresholdPct']);

        await this._ensureState('settings.maxTotalRuntimeSec', { type: 'number', role: 'value.interval', read: true, write: true }, DEFAULTS['settings.maxTotalRuntimeSec']);
        await this._ensureState('settings.backgroundImageUrl', { type: 'string', role: 'text', read: true, write: true }, DEFAULTS['settings.backgroundImageUrl']);
        await this._ensureState('settings.backgroundImageFileName', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('settings.backgroundBlurPx', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.backgroundBlurPx']);
        await this._ensureState('settings.backgroundDimPct', { type: 'number', role: 'value', read: true, write: true }, DEFAULTS['settings.backgroundDimPct']);

        await this._ensureState('status.lastScheduleRunDate', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.autoMorningHandledDate', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.autoEveningHandledDate', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.autoInterimHandledDate', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.autoMorningSkippedForRain', { type: 'boolean', role: 'indicator', read: true, write: false }, false);
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

    // Gibt true zurück, wenn Temperatur- ODER Sonnenschwelle erreicht ist.
    // useForecast=true vergleicht gegen die Tagesvorhersage (Morgen/Abend), sonst gegen aktuelle Messwerte (Zwischenwässerung).
    _heatGateMet(weather, tempThreshold, sunThreshold, useForecast) {
        const temp = useForecast ? weather.tempForecastMaxC : weather.tempCurrentC;
        const sun = useForecast ? weather.sunForecastMJm2 : weather.sunCurrentWm2;
        return (temp != null && temp >= tempThreshold) || (sun != null && sun >= sunThreshold);
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
        const scheduleEnabled = await this._getBool('settings.scheduleEnabled', DEFAULTS['settings.scheduleEnabled']);
        if (!scheduleEnabled) return;

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

        const morningEnabled = await this._getBool('settings.autoMorningEnabled', DEFAULTS['settings.autoMorningEnabled']);
        const eveningEnabled = await this._getBool('settings.autoEveningEnabled', DEFAULTS['settings.autoEveningEnabled']);
        const interimEnabled = await this._getBool('settings.autoInterimEnabled', DEFAULTS['settings.autoInterimEnabled']);
        const morningTime = await this._getStr('settings.autoMorningTime', DEFAULTS['settings.autoMorningTime']);
        const eveningTime = await this._getStr('settings.autoEveningTime', DEFAULTS['settings.autoEveningTime']);
        const morningHandled = await this._getStr('status.autoMorningHandledDate', '');
        const eveningHandled = await this._getStr('status.autoEveningHandledDate', '');
        const interimHandled = await this._getStr('status.autoInterimHandledDate', '');
        let morningSkippedForRain = await this._getBool('status.autoMorningSkippedForRain', false);

        // 1) Morgen-Checkpoint
        if (morningEnabled && morningHandled !== todayStr && this._timeReached(now, morningTime)) {
            await this.adapter.setStateAsync('status.autoMorningHandledDate', todayStr, true);
            const weather = await this.weather.getWeather();
            const tempThreshold = await this._getNum('settings.autoMorningTempThresholdC', DEFAULTS['settings.autoMorningTempThresholdC']);
            const sunThreshold = await this._getNum('settings.autoMorningSunThresholdMJm2', DEFAULTS['settings.autoMorningSunThresholdMJm2']);
            if (this._heatGateMet(weather, tempThreshold, sunThreshold, true)) {
                const rainCurrentThresholdMm = await this._getNum('settings.autoMorningRainCurrentThresholdMm', DEFAULTS['settings.autoMorningRainCurrentThresholdMm']);
                const rainForecastThresholdPct = await this._getNum('settings.autoMorningRainForecastThresholdPct', DEFAULTS['settings.autoMorningRainForecastThresholdPct']);
                const result = await this._evaluateAndMaybeRun('auto-morning', { rainCurrentThresholdMm, rainForecastThresholdPct });
                morningSkippedForRain = result.skipReason === 'rain-current' || result.skipReason === 'rain-forecast';
            } else {
                morningSkippedForRain = false;
            }
            await this.adapter.setStateAsync('status.autoMorningSkippedForRain', morningSkippedForRain, true);
        }

        // 2) Zwischenwässerung (unabhängig ein-/ausschaltbar, hitzegetriggert über aktuelle Messwerte, 1x/Tag, nur vor der Abend-Zeit)
        if (interimEnabled && (!morningEnabled || morningHandled === todayStr) && interimHandled !== todayStr && !this._timeReached(now, eveningTime)) {
            const weather = await this.weather.getWeather();
            const tempThreshold = await this._getNum('settings.autoInterimTempThresholdC', DEFAULTS['settings.autoInterimTempThresholdC']);
            const sunThreshold = await this._getNum('settings.autoInterimSunThresholdWm2', DEFAULTS['settings.autoInterimSunThresholdWm2']);
            if (this._heatGateMet(weather, tempThreshold, sunThreshold, false)) {
                await this.adapter.setStateAsync('status.autoInterimHandledDate', todayStr, true);
                const rainCurrentThresholdMm = await this._getNum('settings.autoInterimRainCurrentThresholdMm', DEFAULTS['settings.autoInterimRainCurrentThresholdMm']);
                const rainForecastThresholdPct = await this._getNum('settings.autoInterimRainForecastThresholdPct', DEFAULTS['settings.autoInterimRainForecastThresholdPct']);
                await this._evaluateAndMaybeRun('auto-interim', { rainCurrentThresholdMm, rainForecastThresholdPct });
            }
        }

        // 3) Nachtrag/Catch-up: nur falls Morgen-Lauf heute wegen Regen ausgefallen ist und Abend-Checkpoint noch nicht dran war
        if (morningSkippedForRain && eveningHandled !== todayStr && !this._timeReached(now, eveningTime)) {
            const weather = await this.weather.getWeather();
            if (!weather.stale) {
                const rainCurrentThresholdMm = await this._getNum('settings.autoMorningRainCurrentThresholdMm', DEFAULTS['settings.autoMorningRainCurrentThresholdMm']);
                const rainForecastThresholdPct = await this._getNum('settings.autoMorningRainForecastThresholdPct', DEFAULTS['settings.autoMorningRainForecastThresholdPct']);
                const currentOk = weather.rainCurrentMm == null || weather.rainCurrentMm < rainCurrentThresholdMm;
                const forecastOk = weather.rainForecastPct == null || weather.rainForecastPct < rainForecastThresholdPct;
                if (currentOk && forecastOk) {
                    await this.adapter.setStateAsync('status.autoMorningSkippedForRain', false, true);
                    await this.history.addEntry({
                        timestamp: new Date().toISOString(),
                        trigger: 'auto-catchup',
                        skipped: false,
                        reason: `Nachtrag: Regenprognose gesunken auf ${weather.rainForecastPct}% (Morgenlauf ausgefallen)`
                    });
                    await this.engine.runFullCycle('auto-catchup').catch((e) => this.adapter.log.error(`Automatik-Nachtrag fehlgeschlagen: ${e.message}`));
                    morningSkippedForRain = false;
                }
            }
        }

        // 4) Abend-Checkpoint: regulärer Abendlauf (autoEveningEnabled) ODER Fallback-Auflösung eines offenen Regen-Skips vom Morgen
        if (eveningHandled !== todayStr && this._timeReached(now, eveningTime) && (eveningEnabled || morningSkippedForRain)) {
            await this.adapter.setStateAsync('status.autoEveningHandledDate', todayStr, true);
            if (morningSkippedForRain) {
                const rainCurrentThresholdMm = await this._getNum('settings.autoMorningRainCurrentThresholdMm', DEFAULTS['settings.autoMorningRainCurrentThresholdMm']);
                const rainForecastThresholdPct = await this._getNum('settings.autoMorningRainForecastThresholdPct', DEFAULTS['settings.autoMorningRainForecastThresholdPct']);
                const result = await this._evaluateAndMaybeRun('auto-fallback', { rainCurrentThresholdMm, rainForecastThresholdPct }, { ignoreForecast: true });
                if (result.ran) {
                    await this.history.addEntry({
                        timestamp: new Date().toISOString(),
                        trigger: 'auto-fallback',
                        skipped: false,
                        reason: 'Abend-Fallback: bis 22:00 kein tatsächlicher Regen registriert, trotz Vorhersage gewässert'
                    });
                }
                await this.adapter.setStateAsync('status.autoMorningSkippedForRain', false, true);
            } else {
                const weather = await this.weather.getWeather();
                const tempThreshold = await this._getNum('settings.autoEveningTempThresholdC', DEFAULTS['settings.autoEveningTempThresholdC']);
                const sunThreshold = await this._getNum('settings.autoEveningSunThresholdMJm2', DEFAULTS['settings.autoEveningSunThresholdMJm2']);
                if (this._heatGateMet(weather, tempThreshold, sunThreshold, true)) {
                    const rainCurrentThresholdMm = await this._getNum('settings.autoEveningRainCurrentThresholdMm', DEFAULTS['settings.autoEveningRainCurrentThresholdMm']);
                    const rainForecastThresholdPct = await this._getNum('settings.autoEveningRainForecastThresholdPct', DEFAULTS['settings.autoEveningRainForecastThresholdPct']);
                    await this._evaluateAndMaybeRun('auto-evening', { rainCurrentThresholdMm, rainForecastThresholdPct });
                }
            }
        }
    }

    async computeNextRun() {
        const automatic = await this._getBool('settings.automaticMode', false);
        const now = new Date();
        if (automatic) {
            const morningEnabled = await this._getBool('settings.autoMorningEnabled', DEFAULTS['settings.autoMorningEnabled']);
            const eveningEnabled = await this._getBool('settings.autoEveningEnabled', DEFAULTS['settings.autoEveningEnabled']);
            const morningTime = await this._getStr('settings.autoMorningTime', DEFAULTS['settings.autoMorningTime']);
            const eveningTime = await this._getStr('settings.autoEveningTime', DEFAULTS['settings.autoEveningTime']);
            const candidates = [];
            if (morningEnabled) candidates.push(morningTime);
            if (eveningEnabled) candidates.push(eveningTime);
            return this._nextOccurrence(now, candidates, null);
        }
        const scheduleEnabled = await this._getBool('settings.scheduleEnabled', DEFAULTS['settings.scheduleEnabled']);
        if (!scheduleEnabled) return '';
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

    _triggerLabel(trigger) {
        const labels = {
            'auto-morning': 'Morgenlauf',
            'auto-interim': 'Zwischenwässerung',
            'auto-catchup': 'Nachtrag',
            'auto-evening': 'Abendlauf',
            'auto-fallback': 'Abend-Fallback'
        };
        return labels[trigger] || trigger;
    }

    async _evaluateAndMaybeRun(trigger, rainThresholds, opts = {}) {
        const { ignoreForecast = false } = opts;
        const { rainCurrentThresholdMm, rainForecastThresholdPct } = rainThresholds;
        const weather = await this.weather.getWeather();
        const timestamp = new Date().toISOString();
        const label = this._triggerLabel(trigger);

        if (weather.stale) {
            this.adapter.log.warn(`Automatik (${label}) übersprungen — Wetterdaten veraltet`);
            await this.history.addEntry({ timestamp, trigger, skipped: true, reason: `${label}: Wetterdaten veraltet` });
            return { ran: false, skipReason: 'stale' };
        }

        if (weather.rainCurrentMm != null && weather.rainCurrentMm >= rainCurrentThresholdMm) {
            await this.history.addEntry({ timestamp, trigger, skipped: true, reason: `${label}: Regen aktuell (${weather.rainCurrentMm}mm)` });
            return { ran: false, skipReason: 'rain-current' };
        }

        if (!ignoreForecast) {
            if (weather.rainForecastPct != null && weather.rainForecastPct >= rainForecastThresholdPct) {
                await this.history.addEntry({ timestamp, trigger, skipped: true, reason: `${label}: Regenwahrscheinlichkeit ${weather.rainForecastPct}%` });
                return { ran: false, skipReason: 'rain-forecast' };
            }
        }

        this.engine.runFullCycle(trigger).catch((e) => this.adapter.log.error(`Automatik-Lauf (${label}) fehlgeschlagen: ${e.message}`));
        return { ran: true };
    }
}

module.exports = { Scheduler };
