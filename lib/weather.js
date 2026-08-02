'use strict';

class WeatherService {
    constructor(adapter) {
        this.adapter = adapter;
        this.lastForeignUpdate = { rain: 0, temp: 0, sun: 0 };
        this.forecastTimer = null;
    }

    async init() {
        await this._ensureState('weather.tempCurrentC', { type: 'number', role: 'value.temperature', read: true, write: false }, null);
        await this._ensureState('weather.sunCurrentWm2', { type: 'number', role: 'value', read: true, write: false }, null);
        await this._ensureState('weather.rainCurrentMm', { type: 'number', role: 'value', read: true, write: false }, null);
        await this._ensureState('weather.rainForecastPct', { type: 'number', role: 'value', read: true, write: false }, null);
        await this._ensureState('weather.tempForecastMaxC', { type: 'number', role: 'value.temperature', read: true, write: false }, null);
        await this._ensureState('weather.rainForecastMm', { type: 'number', role: 'value', read: true, write: false }, null);
        await this._ensureState('weather.sunForecastMJm2', { type: 'number', role: 'value', read: true, write: false }, null);
        await this._ensureState('weather.rainForecastUpdatedAt', { type: 'string', role: 'date', read: true, write: false }, '');
        await this._ensureState('diagnostics.weatherStale', { type: 'boolean', role: 'indicator.maintenance', read: true, write: false }, false);

        const { rainCurrentDP, tempCurrentDP, sunCurrentDP } = this.adapter.config;
        for (const dp of [rainCurrentDP, tempCurrentDP, sunCurrentDP]) {
            if (!dp) continue;
            try {
                await this.adapter.subscribeForeignStatesAsync(dp);
                const s = await this.adapter.getForeignStateAsync(dp);
                if (s) await this._onForeignUpdate(dp, s);
            } catch (e) {
                this.adapter.log.warn(`Wetter-Datenpunkt ${dp} nicht lesbar: ${e.message}`);
            }
        }

        this.adapter.on('stateChange', (id, state) => {
            if (!state) return;
            if ([rainCurrentDP, tempCurrentDP, sunCurrentDP].includes(id)) {
                this._onForeignUpdate(id, state).catch((e) => this.adapter.log.error(e.message));
            }
        });

        await this.fetchForecast();
        this._scheduleForecastFetch();
    }

    async _ensureState(id, common, initialVal) {
        const obj = await this.adapter.getObjectAsync(id);
        if (!obj) {
            await this.adapter.setObjectNotExistsAsync(id, { type: 'state', common: { name: id, ...common }, native: {} });
            await this.adapter.setStateAsync(id, initialVal, true);
        }
    }

    async _onForeignUpdate(dp, state) {
        const { rainCurrentDP, tempCurrentDP, sunCurrentDP } = this.adapter.config;
        const now = Date.now();
        if (dp === rainCurrentDP) {
            this.lastForeignUpdate.rain = now;
            await this.adapter.setStateAsync('weather.rainCurrentMm', state.val, true);
        } else if (dp === tempCurrentDP) {
            this.lastForeignUpdate.temp = now;
            await this.adapter.setStateAsync('weather.tempCurrentC', state.val, true);
        } else if (dp === sunCurrentDP) {
            this.lastForeignUpdate.sun = now;
            await this.adapter.setStateAsync('weather.sunCurrentWm2', state.val, true);
        }
        await this._updateStaleFlag();
    }

    async _updateStaleFlag() {
        const staleMinutes = this.adapter.config.weatherStaleMinutes || 60;
        const now = Date.now();
        const values = Object.values(this.lastForeignUpdate).filter((t) => t > 0);
        const stale = values.length === 0 || values.some((t) => (now - t) / 60000 > staleMinutes);
        await this.adapter.setStateAsync('diagnostics.weatherStale', stale, true);
    }

    _scheduleForecastFetch() {
        if (this.forecastTimer) clearInterval(this.forecastTimer);
        // Ruft die Regen-Vorhersage stündlich ab
        this.forecastTimer = setInterval(() => {
            this.fetchForecast().catch((e) => this.adapter.log.error(`Forecast-Abruf fehlgeschlagen: ${e.message}`));
        }, 60 * 60 * 1000);
    }

    async fetchForecast() {
        const { latitude, longitude } = this.adapter.config;
        if (latitude == null || longitude == null) return;
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_probability_max,temperature_2m_max,precipitation_sum,shortwave_radiation_sum&timezone=auto&forecast_days=1`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const daily = data && data.daily;
            const pct = daily && daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null;
            const tempMax = daily && daily.temperature_2m_max ? daily.temperature_2m_max[0] : null;
            const rainSum = daily && daily.precipitation_sum ? daily.precipitation_sum[0] : null;
            const sunSum = daily && daily.shortwave_radiation_sum ? daily.shortwave_radiation_sum[0] : null;
            if (pct != null) await this.adapter.setStateAsync('weather.rainForecastPct', pct, true);
            if (tempMax != null) await this.adapter.setStateAsync('weather.tempForecastMaxC', tempMax, true);
            if (rainSum != null) await this.adapter.setStateAsync('weather.rainForecastMm', rainSum, true);
            if (sunSum != null) await this.adapter.setStateAsync('weather.sunForecastMJm2', sunSum, true);
            if (pct != null || tempMax != null || rainSum != null || sunSum != null) {
                await this.adapter.setStateAsync('weather.rainForecastUpdatedAt', new Date().toISOString(), true);
                this.adapter.log.debug(`Wetter-Vorhersage aktualisiert: Regen ${pct}%, Tmax ${tempMax}°, Niederschlag ${rainSum}mm, Sonne ${sunSum}MJ/m²`);
            }
        } catch (e) {
            this.adapter.log.warn(`Open-Meteo Forecast nicht erreichbar: ${e.message}`);
        }
    }

    async getWeather() {
        const [temp, sun, rain, forecastPct, forecastTempMax, forecastRainMm, forecastSunMJm2, stale] = await Promise.all([
            this.adapter.getStateAsync('weather.tempCurrentC'),
            this.adapter.getStateAsync('weather.sunCurrentWm2'),
            this.adapter.getStateAsync('weather.rainCurrentMm'),
            this.adapter.getStateAsync('weather.rainForecastPct'),
            this.adapter.getStateAsync('weather.tempForecastMaxC'),
            this.adapter.getStateAsync('weather.rainForecastMm'),
            this.adapter.getStateAsync('weather.sunForecastMJm2'),
            this.adapter.getStateAsync('diagnostics.weatherStale')
        ]);
        return {
            tempCurrentC: temp && temp.val,
            sunCurrentWm2: sun && sun.val,
            rainCurrentMm: rain && rain.val,
            rainForecastPct: forecastPct && forecastPct.val,
            tempForecastMaxC: forecastTempMax && forecastTempMax.val,
            rainForecastMm: forecastRainMm && forecastRainMm.val,
            sunForecastMJm2: forecastSunMJm2 && forecastSunMJm2.val,
            stale: !!(stale && stale.val)
        };
    }
}

module.exports = { WeatherService };
