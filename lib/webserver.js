'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SETTINGS_KEYS = [
    'scheduleEnabled',
    ...WEEKDAY_NAMES.map((d) => `weekday${d}`),
    'startTime',
    'cycleDurationSec',
    'automaticMode',
    'autoTempThresholdC',
    'autoSunThresholdWm2',
    'autoRainCurrentThresholdMm',
    'autoRainForecastThresholdPct',
    'autoMaxRunsPerDay',
    'autoMorningTime',
    'autoEveningTime',
    'backgroundBlurPx',
    'backgroundDimPct',
    'backgroundImageUrl'
];

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function createWebServer(adapter, port) {
    const app = express();
    app.use(express.json());

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 15 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            cb(null, !!MIME_EXT[file.mimetype]);
        }
    });

    app.get('/api/status', async (req, res) => {
        try {
            const [status, weather, nextRun, zoneNames] = await Promise.all([
                adapter.engine.getStatus(),
                adapter.weather.getWeather(),
                adapter.scheduler.computeNextRun(),
                adapter.engine.getZoneNames()
            ]);
            res.json({ ...status, nextRun, weather, zoneNames });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/control/start', async (req, res) => {
        try {
            await adapter.engine.startManualRun();
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/control/stop', async (req, res) => {
        try {
            await adapter.engine.stop('Über WebUI gestoppt');
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/control/emergency-stop', async (req, res) => {
        try {
            await adapter.engine.setEmergencyStop(!!req.body.value);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/settings', async (req, res) => {
        try {
            const result = {};
            for (const key of SETTINGS_KEYS) {
                const s = await adapter.getStateAsync(`settings.${key}`);
                result[key] = s ? s.val : null;
            }
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/settings', async (req, res) => {
        try {
            const updates = req.body || {};
            for (const key of Object.keys(updates)) {
                if (!SETTINGS_KEYS.includes(key)) continue;
                await adapter.setStateAsync(`settings.${key}`, updates[key], true);
            }
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/zones/:index/name', async (req, res) => {
        try {
            const index = parseInt(req.params.index, 10);
            const name = String(req.body.name || '').slice(0, 60);
            if (!name || !adapter.engine.zoneList.find((z) => z.index === index)) {
                return res.status(400).json({ error: 'ungültige Zone oder Name' });
            }
            await adapter.setStateAsync(`zones.${index}.name`, name, true);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/history', async (req, res) => {
        try {
            res.json(await adapter.history.getEntries());
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/background-image', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'kein Bild empfangen' });
            const ext = MIME_EXT[req.file.mimetype];
            const filename = `background.${ext}`;
            await adapter.writeFileAsync(adapter.namespace, filename, req.file.buffer);
            await adapter.setStateAsync('settings.backgroundImageFileName', filename, true);
            await adapter.setStateAsync('settings.backgroundImageUrl', `/api/background-image?t=${Date.now()}`, true);
            res.json({ ok: true, url: `/api/background-image?t=${Date.now()}` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/background-image', async (req, res) => {
        try {
            const s = await adapter.getStateAsync('settings.backgroundImageFileName');
            const filename = s && s.val;
            if (!filename) return res.status(404).end();
            const file = await adapter.readFileAsync(adapter.namespace, filename);
            const ext = filename.split('.').pop();
            const mime = Object.entries(MIME_EXT).find(([, e]) => e === ext);
            res.set('Content-Type', mime ? mime[0] : 'application/octet-stream');
            res.set('Cache-Control', 'no-cache');
            res.send(file.file || file);
        } catch (e) {
            res.status(404).end();
        }
    });

    const wwwDir = path.join(__dirname, '..', 'www');
    if (fs.existsSync(wwwDir)) {
        app.use(express.static(wwwDir));
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
            res.sendFile(path.join(wwwDir, 'index.html'));
        });
    }

    const server = app.listen(port, () => {
        adapter.log.info(`WebUI erreichbar unter http://<host>:${port}/`);
    });
    return server;
}

module.exports = { createWebServer };
