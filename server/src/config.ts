import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow tests / deployments to relocate runtime data without touching code.
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '..', 'data');

// Everything configurable lives here so there's one place to look. The
// defaults are chosen so `npm run dev` works with no .env at all.
export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir,
  recordingsDir: path.resolve(dataDir, 'recordings'),
  dbPath: path.resolve(dataDir, 'db.json'),
  transcription: {
    provider: (process.env.TRANSCRIPTION_PROVIDER ?? 'mock') as 'mock' | 'openai',
    openAiApiKey: process.env.OPENAI_API_KEY,
  },
  // 50 MB. Big enough for a long session, small enough that a stray upload
  // can't fill the disk.
  maxUploadBytes: 50 * 1024 * 1024,
} as const;
