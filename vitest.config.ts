import { defineConfig } from 'vitest/config';

// Per-file `// @vitest-environment jsdom` overrides the default `node` env
// for the few lib tests that need DOM. environmentMatchGlobs is deprecated.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
