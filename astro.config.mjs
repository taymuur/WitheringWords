// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Live Workers deployment; update if the workers.dev subdomain changes.
  site: 'https://witheringwords.taimurshahzad69.workers.dev',
  integrations: [sitemap()],
});
