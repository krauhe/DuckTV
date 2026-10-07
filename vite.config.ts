import { defineConfig } from 'vite';
export default defineConfig({ base: './', build:{rollupOptions:{input:['index.html','training.html','reference.html']}} });
