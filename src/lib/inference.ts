import { streamChat } from './ollama';
import { wllamaChat, initWllama, isModelLoaded } from './wllama-inference';

// Detect if running inside Capacitor (Android app)
// Safe to call in non-browser contexts (uses typeof guard)
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof (window as unknown as Record<string, unknown>).Capacitor !== 'undefined' &&
    ((window as unknown as Record<string, { isNativePlatform?: () => boolean }>).Capacitor)?.isNativePlatform?.() === true
  );
}

export type ModelLoadProgress = {
  progress: number; // 0-100
  status: string;
};

export async function prepareInference(
  onProgress?: (p: ModelLoadProgress) => void
): Promise<void> {
  if (isAndroid() && !isModelLoaded()) {
    await initWllama((progress, status) => {
      onProgress?.({ progress, status });
    });
  }
}

export async function* chatStream(
  messages: { role: string; content: string }[],
  model: string,
  systemPrompt: string
): AsyncGenerator<string> {
  if (isAndroid()) {
    yield* wllamaChat(messages, systemPrompt);
  } else {
    yield* streamChat(messages, model, systemPrompt);
  }
}
