import { motion } from 'framer-motion';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        className="flex justify-end mb-4"
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="max-w-[75%] flex flex-col items-end">
          <div
            className="px-5 py-3.5 font-comic text-sm leading-relaxed text-white"
            style={{
              backgroundColor: '#F97316',
              borderRadius: '24px 24px 4px 24px',
              boxShadow: '0 6px 0 #c2410c, 0 8px 16px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </div>
          <span className="text-xs font-comic mt-1.5 mr-1" style={{ color: '#94a3b8' }}>
            {formatTime(message.timestamp)}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-start gap-3 mb-4"
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Owl avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg mt-1"
        style={{
          backgroundColor: '#2563EB',
          boxShadow: '0 3px 0 #1d4ed8, 0 4px 8px rgba(37,99,235,0.3)',
        }}
      >
        🦉
      </div>

      <div className="max-w-[75%] flex flex-col">
        <div
          className="px-5 py-3.5 font-comic text-sm leading-relaxed"
          style={{
            backgroundColor: 'white',
            color: '#1E293B',
            borderRadius: '24px 24px 24px 4px',
            boxShadow: '0 6px 0 #e2e8f0, 0 8px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
            borderLeft: '3px solid #2563EB',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content || (
            <span className="animate-pulse" style={{ color: '#94a3b8' }}>
              ▋
            </span>
          )}
        </div>
        <span className="text-xs font-comic mt-1.5 ml-1" style={{ color: '#94a3b8' }}>
          PintarAI · {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}
