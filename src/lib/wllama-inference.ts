import { Wllama } from '@wllama/wllama';

// Resolve absolute URLs — required inside Web Workers where relative URLs fail
const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';

// Both WASM paths provided — wllama picks multi-thread automatically
// when SharedArrayBuffer is available (enabled via COOP/COEP headers in MainActivity.java)
const WLLAMA_CONFIG = {
  'single-thread/wllama.wasm': `${BASE}/wllama/single-thread/wllama.wasm`,
  'multi-thread/wllama.wasm': `${BASE}/wllama/multi-thread/wllama.wasm`,
} as const;

const MODEL_URL = `${BASE}/models/qwen2.5-0.5b.gguf`;

let wllamaInstance: Wllama | null = null;
let modelLoaded = false;

type ProgressCallback = (progress: number, status: string) => void;

export async function initWllama(onProgress?: ProgressCallback): Promise<void> {
  if (modelLoaded) return;

  onProgress?.(0, 'Mempersiapkan mesin AI...');

  wllamaInstance = new Wllama(WLLAMA_CONFIG);

  onProgress?.(10, 'Memuat model AI (bisa 30-60 detik)...');

  await wllamaInstance.loadModelFromUrl(MODEL_URL, {
    n_ctx: 2048,
    n_batch: 512,
  });

  modelLoaded = true;
  onProgress?.(100, 'AI siap!');
}

// Qwen3 / ChatML chat template
function formatQwenPrompt(
  messages: { role: string; content: string }[],
  systemPrompt: string
): string {
  let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
  for (const msg of messages) {
    prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
  }
  prompt += '<|im_start|>assistant\n';
  return prompt;
}

export async function* wllamaChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  if (!wllamaInstance || !modelLoaded) {
    throw new Error('Model belum dimuat');
  }

  const prompt = formatQwenPrompt(messages, systemPrompt);

  // Use a queue pattern to convert callback-based streaming to AsyncGenerator
  const queue: string[] = [];
  let done = false;
  let error: Error | null = null;
  let resolve: (() => void) | null = null;

  const notify = () => {
    if (resolve) {
      resolve();
      resolve = null;
    }
  };

  // Start generation (don't await — stream below)
  wllamaInstance!.createCompletion(prompt, {
    nPredict: 1024,
    sampling: {
      temp: 0.7,
      top_p: 0.9,
      top_k: 40,
    },
    onNewToken: (_token: number, piece: Uint8Array, _currentText: string, _optionals: unknown) => {
      // Decode piece bytes to string
      const text = new TextDecoder().decode(piece);
      // Filter out stop tokens
      if (text && !text.includes('<|im_end|>') && !text.includes('<|im_start|>')) {
        queue.push(text);
        notify();
      }
    },
  }).then(() => {
    done = true;
    notify();
  }).catch((err: Error) => {
    error = err;
    done = true;
    notify();
  });

  // Yield tokens as they arrive
  while (!done || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift()!;
    } else if (!done) {
      await new Promise<void>(r => { resolve = r; });
    }
  }

  if (error) throw error;
}

export function isModelLoaded(): boolean {
  return modelLoaded;
}
