import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/index.js';

migrate();

const app = createApp();

app.listen(config.port, () => {
  console.log(`✅ API listening on http://localhost:${config.port}`);
  console.log(`   Transcription provider: ${config.transcription.provider}`);
});
