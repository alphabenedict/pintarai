import { registerPlugin } from '@capacitor/core';
import type { LocalModelStatus } from '../types';

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

const DEFAULT_STATE: LocalAiState = {
  status: 'unloaded',
  progress: 0,
  statusText: 'AI lokal belum dimuat.',
  error: null,
  modelName: 'Gemma-4-E2B',
  provider: null,
};

const LocalAi = registerPlugin<LocalAiPlugin>('LocalAi');
const stateListeners = new Set<(state: LocalAiState) => void>();

let currentState: LocalAiState = DEFAULT_STATE;
let statusListenerReady = false;

function emitState(nextState: Partial<LocalAiState>) {
  currentState = { ...currentState, ...nextState };
  stateListeners.forEach(listener => listener({ ...currentState }));
}

async function ensureStatusListener() {
  if (statusListenerReady) return;
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

function defaultGenerationConfig() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const memoryGb = typeof memory === 'number' && Number.isFinite(memory) ? memory : 8;
  if (memoryGb >= 12) return { maxNewTokens: 256, contextWindow: 4096 };
  if (memoryGb >= 8) return { maxNewTokens: 192, contextWindow: 2048 };
  return { maxNewTokens: 128, contextWindow: 1024 };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Gagal memuat AI lokal.';
}

export function getLocalModelState(): LocalAiState {
  return { ...currentState };
}

export function subscribeLocalModelState(listener: (state: LocalAiState) => void): () => void {
  void ensureStatusListener();
  stateListeners.add(listener);
  listener({ ...currentState });
  return () => { stateListeners.delete(listener); };
}

export function isModelLoaded(): boolean {
  return currentState.status === 'ready';
}

export async function initLocalAi(
  onProgress?: (progress: number, status: string) => void,
): Promise<void> {
  await ensureStatusListener();

  if (currentState.status === 'ready') {
    onProgress?.(100, currentState.statusText);
    return;
  }

  try {
    const nextState = await LocalAi.prepareModel({ modelId: 'gemma-4-e2b-gpu' });
    emitState(nextState);
    onProgress?.(nextState.progress, nextState.statusText);
  } catch (err) {
    emitState({
      status: 'error',
      progress: 0,
      statusText: 'Gagal memuat AI lokal.',
      error: toErrorMessage(err),
    });
    throw err;
  }
}

export async function* localAiChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  await ensureStatusListener();

  const requestId = crypto.randomUUID();
  const queue: string[] = [];
  const { maxNewTokens, contextWindow } = defaultGenerationConfig();
  let done = false;
  let errorMessage: string | null = null;
  let resolver: (() => void) | null = null;

  const flush = () => { if (resolver) { resolver(); resolver = null; } };

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
      maxNewTokens,
      contextWindow,
    });

    while (!done || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      await new Promise<void>(resolve => { resolver = resolve; });
    }

    if (errorMessage) throw new Error(errorMessage);

  } finally {
    await Promise.allSettled([
      tokenHandle.remove(),
      completeHandle.remove(),
      errorHandle.remove(),
    ]);
  }
}

export async function cancelLocalAiGeneration(): Promise<void> {
  await LocalAi.cancelGeneration();
}

export async function getLocalRuntimeStats(): Promise<RuntimeStats> {
  return LocalAi.getRuntimeStats();
}
