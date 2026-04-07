import { useState, useEffect } from 'react';
import { checkOllamaStatus } from '../lib/ollama';
import { isAndroid } from '../lib/inference';

const ANDROID_MODEL = 'qwen3.5:0.8b';
const BUNDLED_MODEL_OLLAMA = 'gemma4:e4b';

export function useOllama() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');

  const check = async () => {
    // On Android: wllama handles inference, no Ollama needed
    if (isAndroid()) {
      setStatus('connected');
      setModels([ANDROID_MODEL]);
      setActiveModel(ANDROID_MODEL);
      return;
    }

    setStatus('checking');
    const result = await checkOllamaStatus();
    if (result.running) {
      setStatus('connected');
      setModels(result.models);
      const preferred =
        result.models.find(m => m.includes('gemma4')) ??
        result.models.find(m => m.includes('qwen')) ??
        result.models[0] ??
        BUNDLED_MODEL_OLLAMA;
      setActiveModel(preferred);
    } else {
      setStatus('disconnected');
      setActiveModel('');
    }
  };

  useEffect(() => {
    check();
    if (!isAndroid()) {
      const interval = setInterval(check, 15000);
      return () => clearInterval(interval);
    }
  }, []);

  return { status, models, activeModel, retry: check };
}
