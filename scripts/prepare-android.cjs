#!/usr/bin/env node
/**
 * prepare-android.js
 * Copies qwen3.5:0.8b GGUF from Ollama blobs to public/models/
 * Run: node scripts/prepare-android.js
 */
const fs = require('fs');
const path = require('path');

const HOME = process.env.USERPROFILE || process.env.HOME;
const BLOBS_DIR = path.join(HOME, '.ollama', 'models', 'blobs');
const DEST_DIR = path.join(__dirname, '..', 'public', 'models');

// qwen2.5:0.5b model weights blob (~397MB, fits in Android WebView WASM)
const MODEL_BLOB = 'sha256-c5396e06af294bd101b30dce59131a76d2b773e76950acc870eda801d3ab0515';
const MODEL_DEST = 'qwen2.5-0.5b.gguf';

async function main() {
  console.log('\n🦉 PintarAI Android - Prepare Model\n');

  // Also ensure wllama WASM is in public/wllama/single-thread/
  const wasmSrc = path.join(__dirname, '..', 'node_modules/@wllama/wllama/esm/single-thread/wllama.wasm');
  const wasmDest = path.join(__dirname, '..', 'public/wllama/single-thread/wllama.wasm');
  if (!fs.existsSync(wasmDest)) {
    fs.mkdirSync(path.dirname(wasmDest), { recursive: true });
    fs.copyFileSync(wasmSrc, wasmDest);
    console.log('✓ wllama WASM copied to public/wllama/single-thread/');
  }

  const src = path.join(BLOBS_DIR, MODEL_BLOB);
  const dest = path.join(DEST_DIR, MODEL_DEST);

  if (!fs.existsSync(src)) {
    console.error(`✗ Model blob not found: ${src}`);
    console.error('  Run: ollama pull qwen3.5:0.8b');
    process.exit(1);
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  // Skip if already copied and same size
  if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) {
    console.log(`✓ Model already prepared: ${MODEL_DEST}`);
    console.log('  Run "npm run build:android" to build the APK.\n');
    return;
  }

  const sizeMB = (fs.statSync(src).size / 1e6).toFixed(0);
  console.log(`→ Copying qwen3.5:0.8b GGUF (${sizeMB} MB)...`);
  console.log('  This may take a minute...');

  fs.copyFileSync(src, dest);
  console.log(`✓ Done: public/models/${MODEL_DEST}`);
  console.log('\n  Now run: npm run build:android\n');
}

main().catch(console.error);
