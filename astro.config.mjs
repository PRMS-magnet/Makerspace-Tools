import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wurve.xyz',
  trailingSlash: 'never',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  redirects: {
    '/wall': '/framing?mode=wall',
    '/floor': '/framing?mode=floor',
  },
  integrations: [sitemap()],
});
