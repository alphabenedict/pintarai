import { Wllama } from '@wllama/wllama';
import type { LocalModelStatus } from '../types';

const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';

const WLLAMA_CONFIG = {
  'single-thread/wllama.wasm': `${BASE}/wllama/single-thread/wllama.wasm`,
  'multi-thread/wllama.wasm': `${BASE}/wllama/multi-thread/wllama.wasm`,
} as const;

const WLLAMA_OPTS = { allowOffline: true };

const DESKTOP_GGUF_URL =
  import.meta.env.VITE_ANDROID_LOCAL_GGUF_URL?.trim() ||
  'http://127.0.0.1:11435/nemotron-mini.gguf';
const DESKTOP_GGUF_NAME = 'nemotron:4b';

const HF_MODEL_REPO = 'bartowski/Nemotron-Mini-4B-Instruct-GGUF';
const HF_MODEL_FILE = 'Nemotron-Mini-4B-Instruct-Q4_K_M.gguf';
const HF_MODEL_NAME = 'Nemotron-Mini-4B';

const BUNDLED_MODEL_URL = `${BASE}/models/qwen2.5-0.5b.gguf`;
const BUNDLED_MODEL_NAME = 'qwen2.5-0.5b';

const MAX_HISTORY_PAIRS = 2;

type ProgressCallback = (progress: number, status: string) => void;

type LocalModelState = {
  status: LocalModelStatus;
  progress: number;
  statusText: string;
  error: string | null;
  modelName: string;
};

let wllamaInstance: Wllama | null = null;
let modelLoaded = false;
let activeModelName = DESKTOP_GGUF_NAME;
let initPromise: Promise<void> | null = null;
let localModelState: LocalModelState = {
  status: 'unloaded',
  progress: 0,
  statusText: 'AI lokal belum dimuat.',
  error: null,
  modelName: DESKTOP_GGUF_NAME,
};

const listeners = new Set<(state: LocalModelState) => void>();

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Gagal memuat AI lokal';
}

function emitState() {
  const snapshot = getLocalModelState();
  listeners.forEach(listener => listener(snapshot));
}

function setLocalModelState(partial: Partial<LocalModelState>) {
  localModelState = { ...localModelState, ...partial };
  emitState();
}

function handleProgress(
  onProgress: ProgressCallback | undefined,
  baseProgress: number,
  progressSpan: number,
  label: string,
  loaded: number,
  total: number
) {
  if (total > 0) {
    const pct = baseProgress + Math.round((loaded / total) * progressSpan);
    const mb = Math.round(loaded / 1024 / 1024);
    const totalMb = Math.round(total / 1024 / 1024);
    const text = `${label} ${mb}/${totalMb}MB`;
    onProgress?.(pct, text);
    setLocalModelState({ status: 'loading', progress: pct, statusText: text, error: null });
  } else {
    const text = `${label} dari cache...`;
    onProgress?.(baseProgress + Math.round(progressSpan / 2), text);
    setLocalModelState({
      status: 'loading',
      progress: baseProgress + Math.round(progressSpan / 2),
      statusText: text,
      error: null,
    });
  }
}

export function getLocalModelState(): LocalModelState {
  return { ...localModelState };
}

export function subscribeLocalModelState(listener: (state: LocalModelState) => void): () => void {
  listeners.add(listener);
  listener(getLocalModelState());
  return () => listeners.delete(listener);
}

export async function initWllama(onProgress?: ProgressCallback): Promise<void> {
  if (modelLoaded) {
    onProgress?.(100, 'AI siap!');
    setLocalModelState({ status: 'ready', progress: 100, statusText: 'AI siap!', error: null });
    return;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    setLocalModelState({
      status: 'loading',
      progress: 0,
      statusText: 'Mempersiapkan AI lokal...',
      error: null,
      modelName: DESKTOP_GGUF_NAME,
    });
    onProgress?.(0, 'Mempersiapkan AI lokal...');

    wllamaInstance = new Wllama(WLLAMA_CONFIG, WLLAMA_OPTS);
    const nThreads = Math.min(4, (navigator.hardwareConcurrency ?? 2) - 1) || 1;

    try {
      await wllamaInstance.loadModelFromUrl(DESKTOP_GGUF_URL, {
        n_ctx: 512,
        n_batch: 256,
        n_threads: nThreads,
        useCache: true,
        progressCallback: ({ loaded, total }) => {
          handleProgress(onProgress, 4, 88, 'Mengunduh Gemma 4 dari komputer...', loaded, total);
        },
      });
      activeModelName = DESKTOP_GGUF_NAME;
    } catch {
      try {
        await wllamaInstance.loadModelFromHF(HF_MODEL_REPO, HF_MODEL_FILE, {
          n_ctx: 256,
          n_batch: 128,
          n_threads: nThreads,
          useCache: true,
          progressCallback: ({ loaded, total }) => {
            handleProgress(onProgress, 8, 82, 'Mengunduh Gemma ringan...', loaded, total);
          },
        });
        activeModelName = HF_MODEL_NAME;
      } catch {
        onProgress?.(10, 'Memuat model offline bawaan...');
        setLocalModelState({
          status: 'loading',
          progress: 10,
          statusText: 'Memuat file AI internal (ini butuh waktu sejenak)...',
          error: null,
          modelName: BUNDLED_MODEL_NAME,
        });

        wllamaInstance = new Wllama(WLLAMA_CONFIG, WLLAMA_OPTS);
        
        // Fix Capacitor Range Request Bug: Fetch entire file into RAM first
        const response = await fetch(BUNDLED_MODEL_URL);
        if (!response.ok) throw new Error(`Bundled model fetch failed: ${response.status}`);
        
        onProgress?.(50, 'Mengekstrak model ke memori...');
        const buffer = await response.arrayBuffer();
        const blob = new Blob([buffer]);
        
        await wllamaInstance.loadModel([blob], {
          n_ctx: 256,
          n_batch: 128,
          n_threads: nThreads,
        });
        
        activeModelName = BUNDLED_MODEL_NAME;
      }
    }

    modelLoaded = true;
    onProgress?.(100, 'AI siap!');
    setLocalModelState({
      status: 'ready',
      progress: 100,
      statusText: 'AI siap!',
      error: null,
      modelName: activeModelName,
    });
  })().catch(err => {
    modelLoaded = false;
    wllamaInstance = null;
    setLocalModelState({
      status: 'error',
      progress: 0,
      statusText: 'Gagal memuat AI lokal.',
      error: getErrorMessage(err),
      modelName: DESKTOP_GGUF_NAME,
    });
    throw err;
  }).finally(() => {
    initPromise = null;
  });

  return initPromise;
}

export async function* wllamaChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  if (!wllamaInstance || !modelLoaded) {
    throw new Error('Model belum dimuat');
  }

  const trimmed = messages.length > MAX_HISTORY_PAIRS * 2
    ? messages.slice(-(MAX_HISTORY_PAIRS * 2))
    : messages;

  const decoder = new TextDecoder();
  const queue: string[] = [];
  let done = false;
  let resolver: (() => void) | null = null;

  const flush = () => {
    if (resolver) {
      resolver();
      resolver = null;
    }
  };

  wllamaInstance.createChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      ...trimmed.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    {
      nPredict: 80,
      sampling: { temp: 0.4, top_p: 0.9, top_k: 20 },
      onNewToken: (_token, piece) => {
        const text = decoder.decode(piece);
        if (text) {
          queue.push(text);
          flush();
        }
      },
    }
  ).then(() => {
    done = true;
    flush();
  }).catch(() => {
    done = true;
    flush();
  });

  while (!done || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift()!;
    } else {
      await new Promise<void>(resolve => {
        resolver = resolve;
      });
    }
  }
}

export function isModelLoaded(): boolean {
  return modelLoaded;
}
