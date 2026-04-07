import { registerPlugin } from '@capacitor/core';
import type { LocalModelStatus } from '../types';
import {
  getLocalModelState as getWllamaState,
  initWllama,
  isModelLoaded as isWllamaLoaded,
  subscribeLocalModelState as subscribeWllamaState,
  wllamaChat,
} from './wllama-inference';

type LocalAiState = {
  status: LocalModelStatus;
  progress: number;
  statusText: string;
  error: string | null;
  modelName: string;
  provider?: string | null;
};

type RuntimeStats = {
  modelId: string;
  provider: string;
  contextWindow: number;
  estimatedRamMb: number;
  warm: boolean;
  totalGenerations: number;
  lastTokensPerSecond: number;
  lastLoadMs: number;
};

type GenerateStreamOptions = {
  requestId: string;
  systemPrompt: string;
  messages: { role: string; content: string }[];
  temperature: number;
  topP: number;
  topK: number;
  repetitionPenalty: number;
  maxNewTokens: number;
  contextWindow?: number;
};

type LocalAiPlugin = {
  prepareModel(options?: {
    modelId?: string;
    assetManifestPath?: string;
    remoteManifestUrl?: string;
    forceReinstall?: boolean;
  }): Promise<LocalAiState>;
  generateStream(options: GenerateStreamOptions): Promise<{ requestId: string }>;
  cancelGeneration(): Promise<void>;
  getRuntimeStats(): Promise<RuntimeStats>;
  addListener(
    eventName: 'localAiStatus' | 'localAiToken' | 'localAiComplete' | 'localAiError',
    listenerFunc: (event: Record<string, unknown>) => void
  ): Promise<{ remove: () => Promise<void> }>;
};

type BackendMode = 'native' | 'wllama' | null;

const DEFAULT_STATE: LocalAiState = {
  status: 'unloaded',
  progress: 0,
  statusText: 'AI lokal belum dimuat.',
  error: null,
  modelName: 'nemotron-mini-int4',
  provider: null,
};

const LocalAi = registerPlugin<LocalAiPlugin>('LocalAi');
const stateListeners = new Set<(state: LocalAiState) => void>();
const manifestUrl = import.meta.env.VITE_ANDROID_LOCAL_AI_MANIFEST_URL?.trim() || undefined;
const assetManifestPath = 'public/local-ai/nemotron-mini-int4/manifest.json';

let currentState: LocalAiState = DEFAULT_STATE;
let statusListenerReady = false;
let wllamaListenerReady = false;
let activeBackend: BackendMode = null;

function isUsingWllamaBackend(): boolean {
  return activeBackend === 'wllama' || currentState.provider === 'wllama';
}

function emitState(nextState: Partial<LocalAiState>) {
  currentState = { ...currentState, ...nextState };
  stateListeners.forEach(listener => listener({ ...currentState }));
}

function mapWllamaStateToLocal(state: ReturnType<typeof getWllamaState>) {
  emitState({
    status: state.status,
    progress: state.progress,
    statusText: state.statusText,
    error: state.error,
    modelName: state.modelName,
    provider: 'wllama',
  });
}

async function ensureStatusListener() {
  if (!statusListenerReady) {
    statusListenerReady = true;
    await LocalAi.addListener('localAiStatus', event => {
      emitState({
        status: (event.status as LocalModelStatus) ?? currentState.status,
        progress: typeof event.progress === 'number' ? event.progress : currentState.progress,
        statusText: typeof event.statusText === 'string' ? event.statusText : currentState.statusText,
        error: typeof event.error === 'string' ? event.error : null,
        modelName: typeof event.modelName === 'string' ? event.modelName : currentState.modelName,
        provider: typeof event.provider === 'string' ? event.provider : null,
      });
    });
  }

  if (!wllamaListenerReady) {
    wllamaListenerReady = true;
    subscribeWllamaState(mapWllamaStateToLocal);
  }
}

function estimatedDeviceMemoryGb(): number {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === 'number' && Number.isFinite(memory) ? memory : 8;
}

function defaultGenerationConfig() {
  const memoryGb = estimatedDeviceMemoryGb();
  if (memoryGb >= 12) {
    return { maxNewTokens: 256, contextWindow: 4096 };
  }
  if (memoryGb >= 8) {
    return { maxNewTokens: 192, contextWindow: 2048 };
  }
  return { maxNewTokens: 128, contextWindow: 1024 };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Gagal memuat AI lokal.';
}

function wllamaStats(): RuntimeStats {
  return {
    modelId: currentState.modelName,
    provider: 'wllama',
    contextWindow: estimatedDeviceMemoryGb() >= 8 ? 2048 : 1024,
    estimatedRamMb: 0,
    warm: isWllamaLoaded(),
    totalGenerations: 0,
    lastTokensPerSecond: 0,
    lastLoadMs: 0,
  };
}

export function getLocalModelState(): LocalAiState {
  return { ...currentState };
}

export function subscribeLocalModelState(listener: (state: LocalAiState) => void): () => void {
  void ensureStatusListener();
  stateListeners.add(listener);
  listener({ ...currentState });
  return () => {
    stateListeners.delete(listener);
  };
}

export function isModelLoaded(): boolean {
  return currentState.status === 'ready';
}

export async function initLocalAi(
  onProgress?: (progress: number, status: string) => void,
  forceReinstall = false
): Promise<void> {
  await ensureStatusListener();

  if (currentState.status === 'ready' && !forceReinstall) {
    onProgress?.(100, currentState.statusText);
    return;
  }

  try {
    const nextState = await LocalAi.prepareModel({
      modelId: 'nemotron-mini-int4',
      assetManifestPath,
      remoteManifestUrl: manifestUrl,
      forceReinstall,
    });
    activeBackend = 'native';
    emitState(nextState);
    onProgress?.(nextState.progress, nextState.statusText);
    return;
  } catch (nativeError) {
    const nativeMessage = toErrorMessage(nativeError);
    emitState({
      status: 'loading',
      progress: 2,
      statusText: 'Model ONNX belum tersedia, beralih ke Nemotron lokal...',
      error: nativeMessage,
      modelName: 'nemotron3:4b',
      provider: 'wllama',
    });
  }

  try {
    activeBackend = 'wllama';
    await initWllama((progress, status) => {
      onProgress?.(progress, status);
    });
  } catch (fallbackError) {
    emitState({
      status: 'error',
      progress: 0,
      statusText: 'Gagal memuat AI lokal.',
      error: toErrorMessage(fallbackError),
    });
    throw fallbackError;
  }
}

export async function* localAiChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  await ensureStatusListener();

  if (isUsingWllamaBackend()) {
    yield* wllamaChat(messages, systemPrompt);
    return;
  }

  const requestId = crypto.randomUUID();
  const queue: string[] = [];
  const generationConfig = defaultGenerationConfig();
  let done = false;
  let errorMessage: string | null = null;
  let resolver: (() => void) | null = null;

  const flush = () => {
    if (resolver) {
      resolver();
      resolver = null;
    }
  };

  const tokenHandle = await LocalAi.addListener('localAiToken', event => {
    if (event.requestId !== requestId) return;
    const chunk = typeof event.chunk === 'string' ? event.chunk : '';
    if (!chunk) return;
    queue.push(chunk);
    flush();
  });

  const completeHandle = await LocalAi.addListener('localAiComplete', event => {
    if (event.requestId !== requestId) return;
    done = true;
    flush();
  });

  const errorHandle = await LocalAi.addListener('localAiError', event => {
    if (event.requestId !== requestId) return;
    errorMessage = typeof event.message === 'string' ? event.message : 'Inferensi lokal gagal.';
    done = true;
    flush();
  });

  try {
    await LocalAi.generateStream({
      requestId,
      systemPrompt,
      messages,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repetitionPenalty: 1.05,
      maxNewTokens: generationConfig.maxNewTokens,
      contextWindow: generationConfig.contextWindow,
    });

    while (!done || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }

      await new Promise<void>(resolve => {
        resolver = resolve;
      });
    }

    if (errorMessage) {
      throw new Error(errorMessage);
    }
  } catch (nativeError) {
    await initLocalAi();
    if (isUsingWllamaBackend()) {
      yield* wllamaChat(messages, systemPrompt);
      return;
    }
    throw nativeError;
  } finally {
    await Promise.allSettled([
      tokenHandle.remove(),
      completeHandle.remove(),
      errorHandle.remove(),
    ]);
  }
}

export async function cancelLocalAiGeneration(): Promise<void> {
  if (isUsingWllamaBackend()) {
    return;
  }
  await LocalAi.cancelGeneration();
}

export async function getLocalRuntimeStats(): Promise<RuntimeStats> {
  if (isUsingWllamaBackend()) {
    return wllamaStats();
  }
  return LocalAi.getRuntimeStats();
}
