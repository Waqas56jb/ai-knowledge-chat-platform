import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js', 'tests/security/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false, // integration suites share the real database
    env: { NODE_ENV: 'test', WORKER_ENABLED: 'false', LOG_LEVEL: 'silent', MAIL_ENABLED: 'false', RETRIEVAL_ASSIST: 'false' }
  }
});
