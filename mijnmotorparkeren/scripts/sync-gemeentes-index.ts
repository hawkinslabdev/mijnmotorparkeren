// scripts/sync-gemeentes-index.ts
// Script to sync gemeente references in index.json with files in /gemeentes/

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_PATH = path.join(__dirname, '../data/index.json');
const GEMEENTES_DIR = path.join(__dirname, '../data/gemeentes');

function readJSON(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getCentroid(boundaries: any): { lat: number, lng: number } | null {
  if (!boundaries || !boundaries.coordinates) return null;
  let coords: number[][] = [];
  if (boundaries.type === 'Polygon') {
    coords = boundaries.coordinates[0];
  } else if (boundaries.type === 'MultiPolygon') {
    coords = boundaries.coordinates[0][0];
  } else {
    return null;
  }
  if (!coords || coords.length === 0) return null;
  let x = 0, y = 0, n = coords.length;
  for (const [lng, lat] of coords) {
    x += lng;
    y += lat;
  }
  return { lat: y / n, lng: x / n };
}

function main() {
  const index = readJSON(INDEX_PATH);
  const referenced = new Set(index.gemeentes.map((g: any) => g.reference));

  const files = fs.readdirSync(GEMEENTES_DIR).filter(f => f.endsWith('.json'));
  const missing = files.filter(f => !referenced.has('gemeentes/' + f));

  // Remove invalid references from index.json
  const fileSet = new Set(files.map(f => 'gemeentes/' + f));
  const before = index.gemeentes.length;
  index.gemeentes = index.gemeentes.filter((g: any) => fileSet.has(g.reference));
  const removed = before - index.gemeentes.length;
  if (removed > 0) {
    console.log(`Removed ${removed} invalid index entries.`);
  }

  // Validate required fields in each entry
  const requiredFields = ['id', 'name', 'province', 'coordinates'];
  const invalidEntries = index.gemeentes.filter((g: any) =>
    requiredFields.some(field => g[field] === undefined || g[field] === null)
  );
  if (invalidEntries.length > 0) {
    console.log('Entries with missing required fields:');
    for (const entry of invalidEntries) {
      console.log(entry.reference || entry.id || JSON.stringify(entry));
    }
  }

  if (missing.length === 0) {
    console.log('No missing gemeente files.');
    return;
  }

  // Build a map of all gemeente files
  const gemeenteFileMap = new Map();
  for (const file of files) {
    const filePath = path.join(GEMEENTES_DIR, file);
    const gemeente = readJSON(filePath);
    let coordinates = gemeente.coordinates;
    if ((!coordinates || !coordinates.lat || !coordinates.lng) && gemeente.boundaries) {
      const centroid = getCentroid(gemeente.boundaries);
      if (centroid) coordinates = centroid;
    }
    gemeenteFileMap.set('gemeentes/' + file, { ...gemeente, coordinates });
  }

  // For every entry in index.json, if a gemeente file exists, always update to id, name, province, coordinates, reference
  for (let i = 0; i < index.gemeentes.length; i++) {
    const entry = index.gemeentes[i];
    if (entry.reference) {
      const gemeenteData = gemeenteFileMap.get(entry.reference);
      if (gemeenteData) {
        index.gemeentes[i] = {
          id: gemeenteData.id,
          name: gemeenteData.name,
          province: gemeenteData.province,
          coordinates: gemeenteData.coordinates,
          reference: entry.reference
        };
      } else {
        console.log(`No gemeente file found for ${entry.reference}`);
      }
    }
  }

  // Add missing gemeente files as complete entries with reference
  if (missing.length > 0) {
    for (const file of missing) {
      const gemeenteData = gemeenteFileMap.get('gemeentes/' + file);
      if (gemeenteData) {
        console.log(`Adding missing gemeente: gemeentes/${file}`);
        index.gemeentes.push({
          id: gemeenteData.id,
          name: gemeenteData.name,
          province: gemeenteData.province,
          coordinates: gemeenteData.coordinates,
          reference: 'gemeentes/' + file
        });
      }
    }
  }

  // Always write the updated index.gemeentes to disk after syncing
  writeJSON(INDEX_PATH, index);
  console.log('index.json updated.');
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  main();
}
