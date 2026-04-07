import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Calculator, BookOpen,
  Microscope, Globe, Flag, Languages, Palette, Sparkles, Zap
} from 'lucide-react';
import { isGroqReady } from '../lib/groq';
import { isAndroid } from '../lib/inference';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { OllamaStatus } from './OllamaStatus';
import { PromptInput } from './ui/ai-chat-input';
import { LocalModelStatus, Subject } from '../types';
import { useChat } from '../hooks/useChat';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Calculator, BookOpen, Microscope, Globe, Flag, Languages, Palette, Sparkles,
};

interface ChatInterfaceProps {
  subject: Subject;
  onBack: () => void;
  ollamaStatus: 'checking' | 'connected' | 'disconnected';
  activeModel: string;
  onRetry: () => void;
  localStatus: LocalModelStatus;
}

export function ChatInterface({
  subject,
  onBack,
  ollamaStatus,
  activeModel,
  onRetry,
  localStatus,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, clearChat, setCurrentSubject, activeBackend } = useChat(activeModel);
  const Icon = iconMap[subject.icon] ?? Sparkles;
  const cloudReady = isGroqReady();
  const localReady = isAndroid() ? localStatus === 'ready' : ollamaStatus === 'connected';
  const isOffline = !cloudReady && !localReady;

  useEffect(() => { setCurrentSubject(subject); }, [subject, setCurrentSubject]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-screen">

      {/* Header — glass */}
      <div
        className="flex-shrink-0 glass-strong flex items-center gap-3 px-4 py-3 safe-top"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.6)', borderRadius: 0 }}
      >
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.08)' }}
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-indigo-600" />
        </motion.button>

        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: subject.color + '18', color: subject.color }}
        >
          <Icon style={{ width: 16, height: 16 }} />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 truncate leading-tight">
            {subject.name}
          </h1>
          <p className="text-xs text-slate-400">{subject.description}</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => { clearChat(); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.08)' }}
          aria-label="Diskusi baru"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
        </motion.button>

        {activeBackend === 'groq' || (cloudReady && activeBackend !== 'local') ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>
            <Zap className="w-3 h-3" />
            Cloud
          </div>
        ) : (
          <OllamaStatus
            status={ollamaStatus}
            activeModel={activeModel}
            onRetry={onRetry}
            localStatus={localStatus}
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div
                className="rounded-[28px] flex items-center justify-center"
                style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)' }}
              >
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div
                className="glass rounded-glass max-w-xs w-full p-4 text-center"
                style={{ borderLeft: '3px solid #6366F1' }}
              >
                <p className="text-sm font-semibold text-indigo-600 mb-1">Halo! Saya PintarAI</p>
                <p className="text-sm text-slate-600">
                  Tanya apa saja tentang{' '}
                  <span className="font-semibold" style={{ color: subject.color }}>{subject.name}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">Siap membantumu belajar 😊</p>
              </div>
              {isOffline && (
                <div className="glass rounded-glass max-w-xs w-full px-4 py-3 text-center border-l-2 border-amber-400">
                  <p className="text-sm font-medium text-amber-600">AI sedang offline</p>
                  <p className="text-xs text-slate-400 mt-0.5">Hubungi guru untuk mengaktifkan AI lokal</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
        </AnimatePresence>

        <AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input — glass */}
      <div
        className="flex-shrink-0 glass-strong px-4 py-3 safe-bottom"
        style={{ borderTop: '1px solid rgba(255,255,255,0.6)', borderRadius: 0 }}
      >
        <PromptInput
          placeholder={isOffline ? 'AI sedang menyiapkan model lokal...' : `Tanya tentang ${subject.name}...`}
          disabled={isOffline || isLoading}
          onSubmit={sendMessage}
          showAttachment={false}
          className="rounded-xl border border-white/60 bg-white/50 backdrop-blur-sm text-sm"
        />
        <p className="text-center text-xs text-slate-400 mt-2">
          Enter untuk kirim · AI lokal offline
        </p>
      </div>
    </div>
  );
}
