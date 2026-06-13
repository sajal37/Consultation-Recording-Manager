import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow tests / deployments to relocate runtime data without touching code.
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '..', 'data');

/** Centralised, environment-driven configuration with safe defaults. */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir,
  recordingsDir: path.resolve(dataDir, 'recordings'),
  dbPath: path.resolve(dataDir, 'db.json'),
  transcription: {
    provider: (process.env.TRANSCRIPTION_PROVIDER ?? 'mock') as 'mock' | 'openai',
    openAiApiKey: process.env.OPENAI_API_KEY,
  },
  // 50 MB cap keeps the demo snappy and protects local disk.
  maxUploadBytes: 50 * 1024 * 1024,
} as const;
