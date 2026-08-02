#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// Eingabeparameter abfragen
// Header
const headerFile = process.argv[2];

if (!headerFile) {
    console.error('Fehler: Bitte gib den Pfad zur Headerdatei an. Seggl');
    process.exit(1);
}

try {
    // Name und Pfad
    const filePath = path.dirname(headerFile);
    const fileName = path.basename(headerFile);
    const scriptName = fileName.split('.header')[0];
    const exitPath = 'dist';
    const exitFile = path.join(exitPath, `${scriptName}.user.js`);
    console.log(`\nBaue Userscript: ${exitFile}`);

    // Text einlesen und Constanten setzten
    const text = fs.readFileSync(headerFile, 'utf8');
    const lines = text.split('\n');
    let headerText = '';
    const filePaths = [];

    // Builddate
    const today = new Date();
    const yy = String(today.getFullYear());
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const buildDate = `${yy}${m}${dd}`;
    console.log(`Build Datum ${buildDate}`);

    // Text verarbeiten
    lines.forEach(line => {
        const trimmedline = line.trim();
        if (/^\/\/\s*@require\s+http:\/\/localhost:8080\//.test(trimmedline)) {
            .replace('/^\/\/\s*@require\s+http:\/\/localhost:8080\//','')
            .trim();




} catch (error) {
    console.error(`Fehler beim Verarbeiten: ${error.message}`);
}
