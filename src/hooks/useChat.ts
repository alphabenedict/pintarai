import { useCallback, useState } from 'react';
import { chatStream } from '../lib/inference';
import { isGroqReady } from '../lib/groq';
import { SUBJECT_PROMPTS } from '../constants';
import type { ActiveBackend, Message, Subject } from '../types';

// Short prompt keeps time-to-first-token fast on local inference.
const SYSTEM_PROMPT = `Kamu adalah PintarAI, tutor AI untuk siswa Indonesia.
Jawab SINGKAT (maks 3 kalimat) dalam Bahasa Indonesia yang jelas.
Beri langkah atau contoh jika diperlukan. Jika tidak yakin, katakan jujur.`;

// Keep only the latest 2 back-and-forth pairs for fast local fallback.
const MAX_HISTORY = 4;

export function useChat(activeModel: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [activeBackend, setActiveBackend] = useState<ActiveBackend>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    if (!activeModel && !isGroqReady()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      const history = [...messages, userMsg]
        .slice(-MAX_HISTORY)
        .map(message => ({ role: message.role, content: message.content }));

      const subjectContext = currentSubject
        ? `\nMata pelajaran: ${currentSubject.name}. ${SUBJECT_PROMPTS[currentSubject.id] ?? ''}`
        : '';

      for await (const chunk of chatStream(
        history,
        activeModel,
        SYSTEM_PROMPT + subjectContext,
        backend => setActiveBackend(backend)
      )) {
        setMessages(prev =>
          prev.map(message =>
            message.id === assistantMsg.id
              ? { ...message, content: message.content + chunk }
              : message
          )
        );
      }
    } catch {
      setMessages(prev =>
        prev.map(message =>
          message.id === assistantMsg.id
            ? { ...message, content: 'Maaf, ada masalah. Pastikan AI sudah aktif ya!' }
            : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, activeModel, currentSubject]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    currentSubject,
    setCurrentSubject,
    activeBackend,
  };
}
