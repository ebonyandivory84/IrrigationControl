'use strict';

const MAX_ENTRIES = 50;

class HistoryLog {
    constructor(adapter) {
        this.adapter = adapter;
    }

    async init() {
        const obj = await this.adapter.getObjectAsync('history.log');
        if (!obj) {
            await this.adapter.setObjectNotExistsAsync('history.log', {
                type: 'state',
                common: { name: 'history.log', type: 'string', role: 'json', read: true, write: false },
                native: {}
            });
            await this.adapter.setStateAsync('history.log', '[]', true);
        }
    }

    async addEntry(entry) {
        const entries = await this.getEntries();
        entries.unshift(entry);
        while (entries.length > MAX_ENTRIES) entries.pop();
        await this.adapter.setStateAsync('history.log', JSON.stringify(entries), true);
    }

    async getEntries() {
        const s = await this.adapter.getStateAsync('history.log');
        if (!s || !s.val) return [];
        try {
            return JSON.parse(s.val);
        } catch (e) {
            return [];
        }
    }
}

module.exports = { HistoryLog };
