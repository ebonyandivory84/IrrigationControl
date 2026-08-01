'use strict';

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', 'www');

if (!fs.existsSync(src)) {
    console.error(`Frontend-Build nicht gefunden unter ${src} — zuerst "npm run build:frontend" im frontend/-Ordner ausführen.`);
    process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Frontend nach ${dest} kopiert.`);
