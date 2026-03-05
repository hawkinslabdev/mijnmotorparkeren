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

/**
 * Compute the parking status from raw parking rules data.
 * Mirrors the logic in src/utils/gemeenteUtils.ts getParkingStatus().
 */
function computeParkingStatus(parkingRules: any): 'sidewalk_allowed' | 'free_parking' | 'paid_parking' | 'no_info' {
  if (!parkingRules) return 'no_info';
  const moto = parkingRules.motorcycleSpecific;
  if (!moto) return 'no_info';

  if ((parkingRules.free === true || moto.freeInPaidZones === true) && moto.allowedOnSidewalk === true) {
    return 'free_parking';
  }
  if (moto.allowedOnSidewalk === true) {
    return 'sidewalk_allowed';
  }
  if (parkingRules.paid?.enabled === true || parkingRules.free === false) {
    return 'paid_parking';
  }
  return 'no_info';
}

function main() {
  const index = readJSON(INDEX_PATH);

  const files = fs.readdirSync(GEMEENTES_DIR).filter(f => f.endsWith('.json'));
  const fileSet = new Set(files.map(f => 'gemeentes/' + f));

  // Remove stale entries
  const before = index.gemeentes.length;
  index.gemeentes = index.gemeentes.filter((g: any) => fileSet.has(g.reference));
  const removed = before - index.gemeentes.length;
  if (removed > 0) console.log(`Removed ${removed} stale index entries.`);

  // Build full map from files
  const gemeenteFileMap = new Map<string, any>();
  for (const file of files) {
    const filePath = path.join(GEMEENTES_DIR, file);
    const gemeente = readJSON(filePath);
    let coordinates = gemeente.coordinates;
    if ((!coordinates?.lat || !coordinates?.lng) && gemeente.boundaries) {
      const centroid = getCentroid(gemeente.boundaries);
      if (centroid) coordinates = centroid;
    }
    gemeenteFileMap.set('gemeentes/' + file, { ...gemeente, coordinates });
  }

  // Build the desired index entry for a gemeente file
  function buildEntry(data: any, reference: string): any {
    return {
      id: data.id,
      name: data.name,
      province: data.province,
      coordinates: data.coordinates,
      ...(data.zoom ? { zoom: data.zoom } : {}),
      ...(data.statcode ? { statcode: data.statcode } : {}),
      parkingStatus: computeParkingStatus(data.parkingRules),
      reference,
    };
  }

  // Update existing entries
  for (let i = 0; i < index.gemeentes.length; i++) {
    const entry = index.gemeentes[i];
    const data = gemeenteFileMap.get(entry.reference);
    if (data) {
      index.gemeentes[i] = buildEntry(data, entry.reference);
    }
  }

  // Add missing entries
  const referenced = new Set(index.gemeentes.map((g: any) => g.reference));
  const added: string[] = [];
  for (const file of files) {
    const ref = 'gemeentes/' + file;
    if (!referenced.has(ref)) {
      const data = gemeenteFileMap.get(ref);
      if (data) {
        index.gemeentes.push(buildEntry(data, ref));
        added.push(ref);
      }
    }
  }
  if (added.length > 0) console.log(`Added ${added.length} missing entries: ${added.join(', ')}`);

  writeJSON(INDEX_PATH, index);
  console.log(`index.json updated: ${index.gemeentes.length} entries.`);
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  main();
}
