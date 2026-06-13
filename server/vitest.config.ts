import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Each test file relocates DATA_DIR; run files in isolation to be safe.
    fileParallelism: false,
  },
});
