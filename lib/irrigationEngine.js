'use strict';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class IrrigationEngine {
    constructor(adapter) {
        this.adapter = adapter;
        this.running = false;
        this.abortFlag = false;
        this.emergencyStopped = false;
        this.currentZone = null;
        this.currentGroup = null;
        this.remainingSec = 0;
        this.countdownTimer = null;
    }

    async init() {
        const groups = this.adapter.config.valveGroups || [];
        this.zoneList = this._buildZoneList(groups);

        await this._ensureState('zones.count', { type: 'number', role: 'value', read: true, write: false }, this.zoneList.length);
        for (const zone of this.zoneList) {
            await this._ensureState(`zones.${zone.index}.name`, { type: 'string', role: 'text', read: true, write: true }, zone.defaultName);
        }

        await this._ensureState('status.running', { type: 'boolean', role: 'indicator.working', read: true, write: false }, false);
        await this._ensureState('status.currentZone', { type: 'number', role: 'value', read: true, write: false }, 0);
        await this._ensureState('status.currentGroup', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.remainingSec', { type: 'number', role: 'value.interval', read: true, write: false }, 0);
        await this._ensureState('status.startedAt', { type: 'string', role: 'date', read: true, write: false }, '');
        await this._ensureState('status.lastRunAt', { type: 'string', role: 'date', read: true, write: false }, '');
        await this._ensureState('status.lastRunTrigger', { type: 'string', role: 'text', read: true, write: false }, '');
        await this._ensureState('status.nextRun', { type: 'string', role: 'date', read: true, write: false }, '');
        await this._ensureState('status.pausedUntil', { type: 'string', role: 'date', read: true, write: true }, '');
        await this._ensureState('status.autoRunsToday', { type: 'number', role: 'value', read: true, write: false }, 0);
        await this._ensureState('status.autoRunsDate', { type: 'string', role: 'text', read: true, write: false }, '');

        await this._ensureState('control.manualRun', { type: 'boolean', role: 'switch', read: true, write: true }, false);
        await this._ensureState('control.emergencyStop', { type: 'boolean', role: 'switch', read: true, write: true }, false);

        await this._ensureState('diagnostics.lastError', { type: 'string', role: 'text', read: true, write: false }, '');

        const runningState = await this.adapter.getStateAsync('status.running');
        if (runningState && runningState.val) {
            // Adapter-Neustart während eines Laufs: Status zurücksetzen, Ventile/Pumpe sicherheitshalber schließen
            await this._closeAll();
            await this.adapter.setStateAsync('status.running', false, true);
        }

        const emergencyState = await this.adapter.getStateAsync('control.emergencyStop');
        this.emergencyStopped = !!(emergencyState && emergencyState.val);
    }

    _buildZoneList(groups) {
        const zones = [];
        let index = 1;
        groups.forEach((group, groupIndex) => {
            for (let i = 0; i < (group.zoneCount || 0); i++) {
                zones.push({
                    index,
                    groupIndex,
                    groupName: group.name || `Verteiler ${groupIndex + 1}`,
                    valveDP: group.valveDP,
                    defaultName: `Zone ${index}`
                });
                index++;
            }
        });
        return zones;
    }

    async _ensureState(id, common, initialVal) {
        const obj = await this.adapter.getObjectAsync(id);
        if (!obj) {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name: id, ...common },
                native: {}
            });
            await this.adapter.setStateAsync(id, initialVal, true);
        }
    }

    async getZoneNames() {
        const names = {};
        for (const zone of this.zoneList) {
            const s = await this.adapter.getStateAsync(`zones.${zone.index}.name`);
            names[zone.index] = (s && s.val) || zone.defaultName;
        }
        return names;
    }

    async getStatus() {
        const [running, currentZone, currentGroup, remainingSec, startedAt, lastRunAt, lastRunTrigger, nextRun, pausedUntil] = await Promise.all([
            this.adapter.getStateAsync('status.running'),
            this.adapter.getStateAsync('status.currentZone'),
            this.adapter.getStateAsync('status.currentGroup'),
            this.adapter.getStateAsync('status.remainingSec'),
            this.adapter.getStateAsync('status.startedAt'),
            this.adapter.getStateAsync('status.lastRunAt'),
            this.adapter.getStateAsync('status.lastRunTrigger'),
            this.adapter.getStateAsync('status.nextRun'),
            this.adapter.getStateAsync('status.pausedUntil')
        ]);
        return {
            running: !!(running && running.val),
            currentZone: (currentZone && currentZone.val) || 0,
            currentGroup: (currentGroup && currentGroup.val) || '',
            remainingSec: (remainingSec && remainingSec.val) || 0,
            startedAt: (startedAt && startedAt.val) || '',
            lastRunAt: (lastRunAt && lastRunAt.val) || '',
            lastRunTrigger: (lastRunTrigger && lastRunTrigger.val) || '',
            nextRun: (nextRun && nextRun.val) || '',
            pausedUntil: (pausedUntil && pausedUntil.val) || '',
            emergencyStopped: this.emergencyStopped,
            zones: this.zoneList
        };
    }

    async onStateChange(id, state) {
        const short = id.replace(`${this.adapter.namespace}.`, '');
        if (short === 'control.manualRun') {
            if (state.val === true && !this.running) {
                await this.startManualRun();
            } else if (state.val === false && this.running && this.currentTrigger === 'manual') {
                await this.stop('manual gestoppt');
            } else {
                await this.adapter.setStateAsync('control.manualRun', state.val, true);
            }
        } else if (short === 'control.emergencyStop') {
            await this.setEmergencyStop(!!state.val);
        } else if (short.startsWith('zones.') && short.endsWith('.name')) {
            await this.adapter.setStateAsync(short, state.val, true);
        }
    }

    async setEmergencyStop(value) {
        if (value) {
            this.emergencyStopped = true;
            await this.stop('Notaus ausgelöst');
            await this.adapter.setStateAsync('control.emergencyStop', true, true);
            this.adapter.log.warn('Notaus (emergencyStop) ausgelöst — alle Läufe gesperrt bis Reset');
        } else {
            this.emergencyStopped = false;
            await this.adapter.setStateAsync('control.emergencyStop', false, true);
            this.adapter.log.info('Notaus zurückgesetzt');
        }
    }

    async startManualRun() {
        if (this.emergencyStopped) {
            this.adapter.log.warn('Manueller Start ignoriert — Notaus aktiv');
            await this.adapter.setStateAsync('control.manualRun', false, true);
            return;
        }
        if (this.running) return;
        await this.adapter.setStateAsync('control.manualRun', true, true);
        this.runFullCycle('manual').catch((e) => this.adapter.log.error(`Manueller Lauf fehlgeschlagen: ${e.message}`));
    }

    async runFullCycle(trigger) {
        return this.runZones(this.zoneList, trigger);
    }

    async runZones(zones, trigger) {
        if (this.emergencyStopped) {
            this.adapter.log.warn(`Lauf (${trigger}) ignoriert — Notaus aktiv`);
            return;
        }
        if (this.running || !zones.length) return;

        this.running = true;
        this.abortFlag = false;
        this.currentTrigger = trigger;
        const startedAt = new Date().toISOString();
        const maxRuntimeSec = this.adapter.config.maxTotalRuntimeSec || 5400;
        const runStart = Date.now();

        await this.adapter.setStateAsync('status.running', true, true);
        await this.adapter.setStateAsync('status.startedAt', startedAt, true);
        this.adapter.log.info(`Bewässerung gestartet (${trigger}), ${zones.length} Zone(n)`);

        await this._setForeign(this.adapter.config.pumpDP, true);
        await sleep(this.adapter.config.pumpLeadTimeMs || 2000);

        let zonesCompleted = 0;
        try {
            for (const zone of zones) {
                if (this.abortFlag || this.emergencyStopped) break;
                if ((Date.now() - runStart) / 1000 > maxRuntimeSec) {
                    this.adapter.log.warn(`Sicherheits-Timeout erreicht (${maxRuntimeSec}s) — Lauf abgebrochen`);
                    break;
                }
                await this._runSingleZone(zone);
                zonesCompleted++;
            }
        } finally {
            await this._closeAll();
            const finishedAt = new Date().toISOString();
            await this.adapter.setStateAsync('status.running', false, true);
            await this.adapter.setStateAsync('status.currentZone', 0, true);
            await this.adapter.setStateAsync('status.currentGroup', '', true);
            await this.adapter.setStateAsync('status.remainingSec', 0, true);
            await this.adapter.setStateAsync('status.lastRunAt', finishedAt, true);
            await this.adapter.setStateAsync('status.lastRunTrigger', trigger, true);
            await this.adapter.setStateAsync('control.manualRun', false, true);
            this.running = false;
            this.abortFlag = false;

            if (this.adapter.history) {
                await this.adapter.history.addEntry({
                    timestamp: finishedAt,
                    trigger,
                    zonesPlanned: zones.length,
                    zonesCompleted,
                    aborted: zonesCompleted < zones.length
                });
            }
            this.adapter.log.info(`Bewässerung beendet (${trigger}): ${zonesCompleted}/${zones.length} Zonen`);
        }
    }

    async _runSingleZone(zone) {
        const durationState = await this.adapter.getStateAsync('settings.cycleDurationSec');
        const durationSec = (durationState && durationState.val) || 600;

        this.currentZone = zone.index;
        this.currentGroup = zone.groupName;
        await this.adapter.setStateAsync('status.currentZone', zone.index, true);
        await this.adapter.setStateAsync('status.currentGroup', zone.groupName, true);

        await this._setForeign(zone.valveDP, true);

        let remaining = durationSec;
        await this.adapter.setStateAsync('status.remainingSec', remaining, true);
        while (remaining > 0 && !this.abortFlag && !this.emergencyStopped) {
            const step = Math.min(5, remaining);
            await sleep(step * 1000);
            remaining -= step;
            await this.adapter.setStateAsync('status.remainingSec', remaining, true);
        }

        await this._setForeign(zone.valveDP, false);

        if (!this.abortFlag && !this.emergencyStopped) {
            await sleep(this.adapter.config.pauseBetweenZonesMs || 20000);
        }
    }

    async stop(reason) {
        if (!this.running) return;
        this.abortFlag = true;
        this.adapter.log.info(`Bewässerung wird gestoppt: ${reason}`);
        // runZones() schließt Ventile/Pumpe im finally-Block und räumt Status auf
        let waited = 0;
        while (this.running && waited < 15000) {
            await sleep(200);
            waited += 200;
        }
        if (this.running) {
            // Sicherheitsnetz, falls der laufende Zyklus nicht rechtzeitig reagiert
            await this._closeAll();
        }
    }

    async _closeAll() {
        const groups = this.adapter.config.valveGroups || [];
        for (const group of groups) {
            await this._setForeign(group.valveDP, false);
        }
        await this._setForeign(this.adapter.config.pumpDP, false);
    }

    async _setForeign(dp, val) {
        if (!dp) return;
        try {
            await this.adapter.setForeignStateAsync(dp, val, true);
        } catch (e) {
            await this.adapter.setStateAsync('diagnostics.lastError', `Schreibfehler ${dp}: ${e.message}`, true);
            this.adapter.log.error(`Konnte ${dp} nicht setzen: ${e.message}`);
        }
    }

    shutdown() {
        this.abortFlag = true;
    }
}

module.exports = { IrrigationEngine };
