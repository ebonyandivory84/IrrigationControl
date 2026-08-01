'use strict';

const utils = require('@iobroker/adapter-core');
const { IrrigationEngine } = require('./lib/irrigationEngine');
const { Scheduler } = require('./lib/scheduler');
const { WeatherService } = require('./lib/weather');
const { HistoryLog } = require('./lib/history');
const { createWebServer } = require('./lib/webserver');

class IrrigationControl extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'irrigation-control' });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.httpServer = null;
        this.checkInterval = null;
    }

    async onReady() {
        this.weather = new WeatherService(this);
        this.history = new HistoryLog(this);
        this.engine = new IrrigationEngine(this);
        this.scheduler = new Scheduler(this, this.engine, this.weather, this.history);

        await this.engine.init();
        await this.scheduler.init();
        await this.weather.init();
        await this.history.init();

        this.subscribeStates('control.*');
        this.subscribeStates('settings.*');

        const port = this.config.httpPort || 8112;
        this.httpServer = createWebServer(this, port);

        // 1x pro Minute: Zeitplan-/Automatik-Trigger + Wetter-Freshness prüfen
        this.checkInterval = setInterval(() => {
            this.scheduler.tick().catch(e => this.log.error(`Scheduler-Tick-Fehler: ${e.message}`));
        }, 60 * 1000);

        this.log.info('Irrigation Control bereit');
    }

    async onStateChange(id, state) {
        if (!state || state.ack) return;
        await this.engine.onStateChange(id, state);
    }

    onUnload(callback) {
        try {
            if (this.checkInterval) clearInterval(this.checkInterval);
            if (this.engine) this.engine.shutdown();
            if (this.httpServer) this.httpServer.close();
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new IrrigationControl(options);
} else {
    new IrrigationControl();
}
