import { useEffect, useState } from 'react';
import { checkOllamaStatus } from '../lib/ollama';
import { isAndroid, prepareInference } from '../lib/inference';
import { getLocalModelState, subscribeLocalModelState } from '../lib/android-local-ai';
import type { LocalModelStatus } from '../types';

const BUNDLED_MODEL_OLLAMA = 'gemma4:e2b';

export function useOllama() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [localStatus, setLocalStatus] = useState<LocalModelStatus>(() => getLocalModelState().status);
  const [localProgress, setLocalProgress] = useState<number>(() => getLocalModelState().progress);
  const [localStatusText, setLocalStatusText] = useState<string>(() => getLocalModelState().statusText);
  const [localError, setLocalError] = useState<string | null>(() => getLocalModelState().error);
  const [localModelName, setLocalModelName] = useState<string>(() => getLocalModelState().modelName);

  const check = async () => {
    if (isAndroid()) {
      try {
        await prepareInference();
      } catch {
        // The shared local model state already captures the error details.
      }
      return;
    }

    setStatus('checking');
    const result = await checkOllamaStatus();
    if (result.running) {
      setStatus('connected');
      setModels(result.models);
      const preferred =
        result.models.find(model => model.includes('gemma4:e2b')) ??
        result.models.find(model => model.includes('gemma4')) ??
        result.models.find(model => model.includes('gemma3n')) ??
        result.models.find(model => model.includes('gemma')) ??
        result.models.find(model => model.includes('qwen')) ??
        result.models[0] ??
        BUNDLED_MODEL_OLLAMA;
      setActiveModel(preferred);
    } else {
      setStatus('disconnected');
      setActiveModel('');
    }
  };

  useEffect(() => {
    if (isAndroid()) {
      setModels([localModelName]);
      setActiveModel(localModelName);
      return subscribeLocalModelState(state => {
        setLocalStatus(state.status);
        setLocalProgress(state.progress);
        setLocalStatusText(state.statusText);
        setLocalError(state.error);
        setLocalModelName(state.modelName);
        setModels([state.modelName]);
        setActiveModel(state.modelName);
      });
    }

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const derivedStatus = isAndroid()
    ? localStatus === 'ready'
      ? 'connected'
      : localStatus === 'error'
        ? 'disconnected'
        : 'checking'
    : status;

  return {
    status: derivedStatus,
    models,
    activeModel: isAndroid() ? localModelName : activeModel,
    retry: check,
    localStatus,
    localProgress,
    localStatusText,
    localError,
  };
}
