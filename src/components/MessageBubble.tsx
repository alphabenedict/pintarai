import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        className="flex justify-end mb-3"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="max-w-[78%] flex flex-col items-end gap-1">
          <div
            className="px-4 py-2.5 text-sm text-white leading-relaxed"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              borderRadius: '18px 18px 4px 18px',
              boxShadow: '0 2px 12px rgba(99,102,241,0.25)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </div>
          <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-start gap-2.5 mb-3"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
        aria-hidden="true"
      >
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="max-w-[78%] flex flex-col gap-1">
        <div
          className="glass px-4 py-2.5 text-sm text-slate-800 leading-relaxed"
          style={{
            borderRadius: '4px 18px 18px 18px',
            borderLeft: '2px solid #6366F1',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content || (
            <span className="text-slate-300">▋</span>
          )}
        </div>
        <span className="text-xs text-slate-400 ml-1">PintarAI · {formatTime(message.timestamp)}</span>
      </div>
    </motion.div>
  );
}
