import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware/errors.js';
import { consultationsRouter } from './routes/consultations.js';
import { recordingsRouter } from './routes/recordings.js';

/** Builds the Express app (no listener) so it can be imported by tests. */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check — handy for demos and deployment probes.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', transcription: config.transcription.provider });
  });

  app.use('/api/consultations', consultationsRouter);
  app.use('/api', recordingsRouter);

  app.use(errorHandler);
  return app;
}
