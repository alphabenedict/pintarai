import { useState, useCallback } from 'react';
import { Message, Subject } from '../types';
import { chatStream } from '../lib/inference';

const SYSTEM_PROMPT = `Kamu adalah PintarAI, asisten belajar yang ramah, sabar, dan pintar untuk siswa sekolah di Indonesia (SD, SMP, SMA).
Tugasmu adalah membantu siswa belajar dengan cara yang menyenangkan dan mudah dipahami.
Gunakan bahasa Indonesia yang baik dan mudah dipahami sesuai usia siswa.
Berikan penjelasan dengan contoh yang dekat dengan kehidupan sehari-hari di Indonesia.
Selalu beri semangat dan pujian ketika siswa bertanya atau berusaha belajar.
Jika tidak tahu jawaban, katakan dengan jujur dan sarankan untuk bertanya ke guru.
Jawab dengan singkat dan jelas. Gunakan emoji sesekali untuk membuat suasana lebih menyenangkan.`;

export function useChat(activeModel: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !activeModel) return;

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
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const subjectContext = currentSubject
        ? `\n\nSiswa sedang belajar mata pelajaran: ${currentSubject.name}. Fokuskan jawaban pada topik ini jika relevan.`
        : '';

      for await (const chunk of chatStream(history, activeModel, SYSTEM_PROMPT + subjectContext)) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: 'Maaf, ada masalah koneksi ke AI. Pastikan Ollama sudah berjalan ya! 🔧' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, activeModel, currentSubject]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat, currentSubject, setCurrentSubject };
}
