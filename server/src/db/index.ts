import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import type { Consultation, Recording } from '../types.js';

/**
 * Tiny zero-dependency, pure-JS persistence layer.
 *
 * Why not SQLite? A native module (better-sqlite3) requires a C/C++ build
 * toolchain that isn't present on every machine, which breaks the
 * "clone and run anywhere" promise this challenge values. A JSON-file store
 * keeps persistence real and inspectable with zero native dependencies and
 * zero setup. The repository API below is intentionally storage-shaped so it
 * could be swapped for SQLite/Postgres later without touching the routes.
 *
 * Writes are synchronous and atomic (write-temp-then-rename) which is correct
 * and more than sufficient for a single-process app at this scale.
 */

interface DbShape {
  consultations: Consultation[];
  recordings: Recording[];
}

const EMPTY: DbShape = { consultations: [], recordings: [] };

function ensureDirs(): void {
  fs.mkdirSync(config.recordingsDir, { recursive: true });
}

function load(): DbShape {
  ensureDirs();
  try {
    const raw = fs.readFileSync(config.dbPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      consultations: parsed.consultations ?? [],
      recordings: parsed.recordings ?? [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

/** In-memory state, hydrated once at startup. */
const state: DbShape = load();

function persist(): void {
  ensureDirs();
  const tmp = path.join(path.dirname(config.dbPath), `.${path.basename(config.dbPath)}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, config.dbPath);
}

/** Exposed so the repository can read/mutate then persist. */
export const store = {
  state,
  persist,
};

/** No-op kept for API parity with a migrating DB; ensures dirs + file exist. */
export function migrate(): void {
  ensureDirs();
  if (!fs.existsSync(config.dbPath)) persist();
}
