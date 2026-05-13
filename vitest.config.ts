import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    environmentMatchGlobs: [
      ['src/lib/**', 'jsdom'],
    ],
  },
});
