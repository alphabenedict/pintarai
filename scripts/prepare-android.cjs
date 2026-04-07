#!/usr/bin/env node
/**
 * prepare-android.cjs
 *
 * Stages an exported Nemotron Mini ONNX package into public/local-ai/
 * for sideload/dev installs on Android.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'nemotron-mini-int4'));
const DEST_DIR = path.resolve(path.join(__dirname, '..', 'public', 'local-ai', 'nemotron-mini-int4'));
const MANIFEST_SCRIPT = path.resolve(path.join(__dirname, 'generate-android-model-manifest.mjs'));

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  console.log('\nPintarAI Android - Stage Nemotron Mini ONNX\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Export folder not found: ${SRC_DIR}`);
    console.error('Run "npm run export:model:android" first, or pass the exported folder path.');
    process.exit(1);
  }

  fs.rmSync(DEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DEST_DIR, { recursive: true });
  copyRecursive(SRC_DIR, DEST_DIR);

  const manifestResult = spawnSync(
    process.execPath,
    [
      MANIFEST_SCRIPT,
      '--input', DEST_DIR,
      '--output', path.join(DEST_DIR, 'manifest.json'),
      '--model-id', 'nemotron-mini-int4',
      '--model-name', 'Nemotron Mini 4B INT4',
      '--entry-file', 'decoder_model_merged.onnx',
      '--tokenizer-file', 'tokenizer.json',
      '--generation-config-file', 'generation_config.json',
      '--tokenizer-config-file', 'tokenizer_config.json',
      '--context-window', '2048',
      '--required-ram-mb', '4096',
    ],
    { stdio: 'inherit' }
  );

  if (manifestResult.status !== 0) {
    process.exit(manifestResult.status ?? 1);
  }

  console.log(`\nModel staged at: ${DEST_DIR}`);
  console.log('Next: run "npm run build:android" to sync the staged manifest into the Android app.');
  console.log('Note: public/local-ai/ is gitignored. Do not commit staged model artifacts.\n');
}

main();
