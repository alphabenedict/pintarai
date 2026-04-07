import { streamChat } from './ollama';
import { groqChat, isGroqReady } from './groq';
import { initLocalAi, isModelLoaded, localAiChat } from './android-local-ai';
import type { ActiveBackend } from '../types';

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof (window as unknown as Record<string, unknown>).Capacitor !== 'undefined' &&
    ((window as unknown as Record<string, { isNativePlatform?: () => boolean }>).Capacitor)?.isNativePlatform?.() === true
  );
}

export type ModelLoadProgress = {
  progress: number;
  status: string;
};

export async function prepareInference(
  onProgress?: (p: ModelLoadProgress) => void
): Promise<void> {
  if (isAndroid() && !isModelLoaded()) {
    await initLocalAi((progress, status) => {
      onProgress?.({ progress, status });
    });
  }
}

export async function* chatStream(
  messages: { role: string; content: string }[],
  model: string,
  systemPrompt: string,
  onBackendChange?: (backend: Exclude<ActiveBackend, null>) => void
): AsyncGenerator<string> {
  // Online-First: Fast <2s response and high accuracy
  if (isGroqReady() && navigator.onLine) {
    try {
      onBackendChange?.('groq');
      yield* groqChat(messages, systemPrompt);
      return;
    } catch (err) {
      console.warn('[PintarAI] Groq failed, falling back to local AI:', err);
    }
  }

  // Fallback: Local AI for Android
  if (isAndroid()) {
    try {
      if (!isModelLoaded()) {
        await initLocalAi();
      }
      onBackendChange?.('local');
      yield* localAiChat(messages, systemPrompt);
      return;
    } catch (err) {
      console.warn('[PintarAI] Android local AI failed:', err);
      throw err;
    }
  }

  // Default fallback (Desktop local Ollama)
  onBackendChange?.('local');
  yield* streamChat(messages, model, systemPrompt);
}
