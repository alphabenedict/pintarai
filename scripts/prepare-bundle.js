#!/usr/bin/env node
/**
 * prepare-bundle.js
 * Run this once before building the Electron installer:
 *   node scripts/prepare-bundle.js
 *
 * Copies Ollama binary + lib DLLs + Gemma4 model blobs into resources/
 */

const fs = require('fs');
const path = require('path');

const HOME = process.env.USERPROFILE || process.env.HOME;
const OLLAMA_INSTALL = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama');
const OLLAMA_MODELS = path.join(HOME, '.ollama', 'models');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');
const DEST_OLLAMA = path.join(RESOURCES_DIR, 'ollama');
const DEST_MODELS = path.join(RESOURCES_DIR, 'models');

// Model: gemma4:e4b
const MODEL_NAME = 'gemma4';
const MODEL_TAG = 'e4b';
const MANIFEST_REGISTRY = 'registry.ollama.ai';

// Blobs required for gemma4:e4b (from the manifest we read)
const REQUIRED_BLOBS = [
  'sha256-4c27e0f5b5adf02ac956c7322bd2ee7636fe3f45a8512c9aba5385242cb6e09a', // model weights 9GB
  'sha256-7339fa418c9ad3e8e12e74ad0fd26a9cc4be8703f9c110728a992b193be85cb2', // license
  'sha256-56380ca2ab89f1f68c283f4d50863c0bcab52ae3f1b9a88e4ab5617b176f71a3', // params
  'sha256-f0988ff50a2458c598ff6b1b87b94d0f5c44d73061c2795391878b00b2285e11', // config
];

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    const srcSize = fs.statSync(src).size;
    const destSize = fs.statSync(dest).size;
    if (srcSize === destSize) {
      console.log(`  Already copied: ${path.basename(dest)}`);
      return;
    }
  }
  console.log(`  Copying: ${path.basename(src)} (${(fs.statSync(src).size / 1e9).toFixed(2)} GB)`);
  fs.copyFileSync(src, dest);
  console.log(`  Done: ${path.basename(dest)}`);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function getDirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    size += entry.isDirectory() ? getDirSize(p) : fs.statSync(p).size;
  }
  return size;
}

async function main() {
  console.log('\nPintarAI Bundle Preparation\n');
  console.log('This will copy ~10GB of files. Please wait...\n');

  // Step 1: Copy Ollama binary + DLLs
  console.log('Step 1: Copying Ollama binary...');
  copyFileSync(
    path.join(OLLAMA_INSTALL, 'ollama.exe'),
    path.join(DEST_OLLAMA, 'ollama.exe')
  );

  console.log('Step 2: Copying Ollama runtime DLLs...');
  const ollamaLibSrc = path.join(OLLAMA_INSTALL, 'lib', 'ollama');
  const ollamaLibDest = path.join(DEST_OLLAMA, 'lib', 'ollama');
  copyDirSync(ollamaLibSrc, ollamaLibDest);

  // Step 3: Copy model manifest
  console.log('\nStep 3: Copying model manifest...');
  const manifestSrc = path.join(OLLAMA_MODELS, 'manifests', MANIFEST_REGISTRY, 'library', MODEL_NAME, MODEL_TAG);
  const manifestDest = path.join(DEST_MODELS, 'manifests', MANIFEST_REGISTRY, 'library', MODEL_NAME, MODEL_TAG);
  copyFileSync(manifestSrc, manifestDest);

  // Step 4: Copy model blobs
  console.log('\nStep 4: Copying model blobs (this takes a while for 9GB weights)...');
  for (const blob of REQUIRED_BLOBS) {
    const src = path.join(OLLAMA_MODELS, 'blobs', blob);
    const dest = path.join(DEST_MODELS, 'blobs', blob);
    if (!fs.existsSync(src)) {
      console.error(`  Missing blob: ${blob}`);
      continue;
    }
    copyFileSync(src, dest);
  }

  console.log('\nBundle preparation complete!');
  console.log('   Run "npm run dist" to build the installer.\n');

  // Print sizes
  const ollamaSize = getDirSize(DEST_OLLAMA);
  const modelsSize = getDirSize(DEST_MODELS);
  console.log(`   Ollama binary + DLLs: ${(ollamaSize / 1e6).toFixed(0)} MB`);
  console.log(`   Models: ${(modelsSize / 1e9).toFixed(2)} GB`);
  console.log(`   Estimated installer size: ~${((ollamaSize + modelsSize) / 1e9 + 0.3).toFixed(1)} GB\n`);
}

main().catch(console.error);
