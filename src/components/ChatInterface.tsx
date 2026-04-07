import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Plus, Calculator, BookOpen,
  Microscope, Globe, Flag, Languages, Palette, Sparkles
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { OllamaStatus } from './OllamaStatus';
import { Subject } from '../types';
import { useChat } from '../hooks/useChat';

const OwlMascotLazy = lazy(() => import('./OwlMascot').then(m => ({ default: m.OwlMascot })));

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Calculator,
  BookOpen,
  Microscope,
  Globe,
  Flag,
  Languages,
  Palette,
  Sparkles,
};

interface ChatInterfaceProps {
  subject: Subject;
  onBack: () => void;
  ollamaStatus: 'checking' | 'connected' | 'disconnected';
  activeModel: string;
  onRetry: () => void;
}

export function ChatInterface({ subject, onBack, ollamaStatus, activeModel, onRetry }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, sendMessage, clearChat, setCurrentSubject } = useChat(activeModel);

  const Icon = iconMap[subject.icon] ?? Sparkles;
  const MAX_CHARS = 500;

  useEffect(() => {
    setCurrentSubject(subject);
  }, [subject, setCurrentSubject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || ollamaStatus !== 'connected') return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    clearChat();
    setInput('');
    inputRef.current?.focus();
  };

  const isOverLimit = input.length > MAX_CHARS;
  const canSend = input.trim().length > 0 && !isLoading && ollamaStatus === 'connected' && !isOverLimit;

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: '#F8FAFC' }}
    >
      {/* Header */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: 'white',
          boxShadow: '0 4px 0 #e2e8f0, 0 6px 16px rgba(0,0,0,0.06)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.9, y: 2 }}
          onClick={onBack}
          className="w-10 h-10 rounded-button flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: '#F8FAFC',
            boxShadow: '0 4px 0 #cbd5e1, 0 6px 12px rgba(0,0,0,0.08)',
          }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#1E293B' }} />
        </motion.button>

        {/* Subject info */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: subject.color,
            boxShadow: `0 3px 0 ${subject.shadowColor}, 0 4px 8px ${subject.color}40`,
          }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-baloo font-bold text-base leading-tight truncate" style={{ color: '#1E293B' }}>
            {subject.name} dengan PintarAI
          </h1>
          <p className="font-comic text-xs" style={{ color: '#64748b' }}>
            {subject.description}
          </p>
        </div>

        {/* New chat button */}
        <motion.button
          whileTap={{ scale: 0.9, y: 2 }}
          onClick={handleNewChat}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-button text-xs font-baloo font-bold"
          style={{
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            boxShadow: '0 3px 0 #1d4ed840, 0 4px 8px rgba(37,99,235,0.1)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Diskusi baru
        </motion.button>

        {/* Mobile new chat */}
        <motion.button
          whileTap={{ scale: 0.9, y: 2 }}
          onClick={handleNewChat}
          className="sm:hidden w-9 h-9 rounded-button flex items-center justify-center"
          style={{
            backgroundColor: '#EFF6FF',
            boxShadow: '0 3px 0 #1d4ed840, 0 4px 8px rgba(37,99,235,0.1)',
          }}
        >
          <Plus className="w-4 h-4" style={{ color: '#2563EB' }} />
        </motion.button>

        {/* Status */}
        <OllamaStatus status={ollamaStatus} activeModel={activeModel} onRetry={onRetry} />
      </motion.header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {/* Welcome message when chat is empty */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 gap-6"
            >
              <Suspense fallback={<div className="w-24 h-24 bg-blue-100 rounded-full animate-pulse" />}>
                <OwlMascotLazy size={100} animate />
              </Suspense>

              <div
                className="max-w-sm w-full p-5 text-center"
                style={{
                  backgroundColor: 'white',
                  borderRadius: '28px',
                  boxShadow: '0 8px 0 #e2e8f0, 0 12px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                  borderLeft: '4px solid #2563EB',
                }}
              >
                <p className="font-baloo font-bold text-lg mb-2" style={{ color: '#2563EB' }}>
                  Halo! Saya PintarAI 🦉
                </p>
                <p className="font-comic text-base" style={{ color: '#1E293B' }}>
                  Ayo tanya apa saja tentang{' '}
                  <span className="font-bold" style={{ color: subject.color }}>
                    {subject.name}
                  </span>
                  !
                </p>
                <p className="font-comic text-xs mt-3" style={{ color: '#94a3b8' }}>
                  Saya siap membantumu belajar dengan sabar dan menyenangkan 😊
                </p>
              </div>

              {ollamaStatus === 'disconnected' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-sm w-full p-4"
                  style={{
                    backgroundColor: '#fff7ed',
                    borderRadius: '20px',
                    border: '2px solid #fed7aa',
                    boxShadow: '0 4px 0 #fdba7440',
                  }}
                >
                  <p className="font-baloo font-bold text-sm text-center" style={{ color: '#9a3412' }}>
                    🔌 PintarAI sedang offline
                  </p>
                  <p className="font-comic text-xs text-center mt-1" style={{ color: '#c2410c' }}>
                    Hubungi guru untuk mengaktifkan AI lokal.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message list */}
        <div>
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.15 }}
        className="flex-shrink-0 p-4"
        style={{
          backgroundColor: 'white',
          boxShadow: '0 -4px 0 #e2e8f0, 0 -6px 16px rgba(0,0,0,0.04)',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                ollamaStatus === 'connected'
                  ? `Tanya tentang ${subject.name}...`
                  : 'AI sedang offline...'
              }
              disabled={ollamaStatus !== 'connected' || isLoading}
              rows={1}
              maxLength={MAX_CHARS + 50}
              className="w-full resize-none font-comic text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                padding: '12px 16px',
                paddingRight: '60px',
                color: '#1E293B',
                boxShadow: '0 4px 0 #e2e8f0, 0 6px 12px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)',
                border: isOverLimit ? '2px solid #ef4444' : '2px solid transparent',
                lineHeight: '1.5',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />

            {/* Char count */}
            {input.length > 400 && (
              <span
                className="absolute right-3 bottom-2 text-xs font-comic"
                style={{ color: isOverLimit ? '#ef4444' : '#94a3b8' }}
              >
                {input.length}/{MAX_CHARS}
              </span>
            )}
          </div>

          {/* Send button */}
          <motion.button
            whileTap={canSend ? { scale: 0.95, y: 4 } : {}}
            onClick={handleSend}
            disabled={!canSend}
            className="w-12 h-12 rounded-button flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              backgroundColor: canSend ? '#F97316' : '#e2e8f0',
              boxShadow: canSend
                ? '0 6px 0 #c2410c, 0 8px 16px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                : '0 4px 0 #cbd5e1, 0 6px 10px rgba(0,0,0,0.06)',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            <Send
              className="w-5 h-5"
              style={{ color: canSend ? 'white' : '#94a3b8' }}
            />
          </motion.button>
        </div>

        <p className="text-center font-comic text-xs mt-2" style={{ color: '#cbd5e1' }}>
          Tekan Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </motion.div>
    </div>
  );
}
