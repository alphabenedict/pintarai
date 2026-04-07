import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// wllama WASM is pre-copied to public/wllama/single-thread/wllama.wasm
// It gets served at /wllama/single-thread/wllama.wasm by Vite's static file server.
// If the wllama package is updated, re-copy with:
//   cp node_modules/@wllama/wllama/esm/single-thread/wllama.wasm public/wllama/single-thread/

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
