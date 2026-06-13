import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import type { Consultation, Recording } from '../types.js';

// The "database" is a JSON file. See PROJECT_NOTES for why it isn't SQLite.
// Whole thing lives in memory; we write it back to disk on every change.
// Writes go to a temp file first and then get renamed over the real one, so a
// crash halfway through can't leave a half-written file behind.

interface DbShape {
  consultations: Consultation[];
  recordings: Recording[];
}

function ensureDirs(): void {
  fs.mkdirSync(config.recordingsDir, { recursive: true });
}

function load(): DbShape {
  ensureDirs();
  try {
    const parsed = JSON.parse(fs.readFileSync(config.dbPath, 'utf8')) as Partial<DbShape>;
    return {
      consultations: parsed.consultations ?? [],
      recordings: parsed.recordings ?? [],
    };
  } catch {
    // No file yet, or it's garbage — start clean.
    return { consultations: [], recordings: [] };
  }
}

const state: DbShape = load();

function persist(): void {
  ensureDirs();
  const tmp = path.join(path.dirname(config.dbPath), `.${path.basename(config.dbPath)}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, config.dbPath);
}

export const store = { state, persist };

// Called once at boot. There's no schema to migrate, but it makes sure the
// data dir and an initial file exist so the first write doesn't fail.
export function migrate(): void {
  ensureDirs();
  if (!fs.existsSync(config.dbPath)) persist();
}

