import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://nhmatsumoto.github.io',
  base: '/nhmatsumoto',
  integrations: [react(), tailwind()],
});
