import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

const preserveDynamicWhitespace = {
  markup({ content, filename }) {
    if (!filename || !(/[/\\]dynamic[/\\]/).test(filename)) return;
    if (content.includes('<svelte:options')) return;
    return { code: '<svelte:options preserveWhitespace />\n' + content };
  },
};

export default defineConfig(({ mode }) => ({
  plugins: [
    svelte({ preprocess: [preserveDynamicWhitespace] }),
    mode === 'production' && viteSingleFile(),
  ].filter(Boolean),
  resolve: {
    conditions: ['browser', 'import'],
  },
  css: {
    postcss: {},
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
