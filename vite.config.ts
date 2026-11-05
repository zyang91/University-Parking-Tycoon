import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base so the built site works on GitHub Pages sub-paths and Cloudflare Pages alike.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
