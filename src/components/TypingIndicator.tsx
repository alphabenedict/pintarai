import { motion, useReducedMotion } from 'framer-motion';
import { Bot } from 'lucide-react';

export function TypingIndicator() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
        aria-hidden="true"
      >
        <Bot className="w-4 h-4 text-white" />
      </div>

      <motion.div
        className="glass px-4 py-3 flex items-center gap-3"
        style={{ borderRadius: '4px 18px 18px 18px', borderLeft: '2px solid #6366F1' }}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="status"
        aria-label="PintarAI sedang berpikir"
      >
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="block w-2 h-2 rounded-full bg-indigo-400"
              animate={prefersReduced ? {} : { y: [0, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">Sedang berpikir...</span>
      </motion.div>
    </div>
  );
}
