// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Set to the production URL once the Cloudflare Pages domain exists.
  site: 'https://withering-words.pages.dev',
  integrations: [sitemap()],
});
