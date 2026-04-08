#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    result[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

function walkFiles(rootDir, currentDir = rootDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(rootDir, absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

function sha256(filePath) {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function maybeReadJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(args.input ?? '');
  const outputPath = path.resolve(args.output ?? path.join(inputDir, 'manifest.json'));

  if (!inputDir || !fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const generationConfig = maybeReadJson(
    args['generation-config-file'] ? path.join(inputDir, args['generation-config-file']) : null
  );
  const tokenizerConfig = maybeReadJson(
    args['tokenizer-config-file'] ? path.join(inputDir, args['tokenizer-config-file']) : null
  );
  const modelConfig = maybeReadJson(path.join(inputDir, 'config.json'));

  const eosTokenIdsRaw =
    generationConfig?.eos_token_id ??
    tokenizerConfig?.eos_token_id ??
    modelConfig?.eos_token_id ??
    1;
  const eosTokenIds = Array.isArray(eosTokenIdsRaw) ? eosTokenIdsRaw : [eosTokenIdsRaw];

  const manifestFiles = [];
  for (const filePath of walkFiles(inputDir).sort()) {
    const relativePath = path.relative(inputDir, filePath).replace(/\\/g, '/');
    if (relativePath === path.basename(outputPath)) continue;
    manifestFiles.push({
      path: relativePath,
      sha256: await sha256(filePath),
      sizeBytes: fs.statSync(filePath).size,
      ...(args['base-url'] ? { url: `${args['base-url'].replace(/\/+$/, '')}/${relativePath}` } : {}),
    });
  }

  const manifest = {
    id: args['model-id'] ?? 'gemma4-e2b-int4',
    version: Number(args.version ?? 1),
    modelName: args['model-name'] ?? 'gemma4-e2b-int4',
    entryFile: args['entry-file'] ?? 'decoder_model_merged.onnx',
    tokenizerFile: args['tokenizer-file'] ?? 'tokenizer.json',
    generationConfigFile: args['generation-config-file'] ?? null,
    tokenizerConfigFile: args['tokenizer-config-file'] ?? null,
    chatTemplate: args['chat-template'] ?? 'gemma4-text',
    bosTokenId:
      generationConfig?.bos_token_id ??
      tokenizerConfig?.bos_token_id ??
      modelConfig?.bos_token_id ??
      null,
    eosTokenIds,
    contextWindow: Number(
      args['context-window'] ??
      modelConfig?.max_position_embeddings ??
      generationConfig?.max_length ??
      2048
    ),
    requiredRamMb: Number(args['required-ram-mb'] ?? 8192),
    files: manifestFiles,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Manifest written: ${outputPath}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
