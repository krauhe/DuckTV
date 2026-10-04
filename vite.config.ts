import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
export default defineConfig({ base: './', define:{'__DUCK_AUDIO_AVAILABLE__':JSON.stringify(existsSync('public/audio/duck-1.wav'))}, build:{rollupOptions:{input:['index.html','training.html']}} });
