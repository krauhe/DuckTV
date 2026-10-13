import { defineConfig } from 'vite';
export default defineConfig({ base: './', cacheDir:'.local/vite-cache', build:{rollupOptions:{input:['index.html','training.html','reference.html']}} });
