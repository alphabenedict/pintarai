import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, X, RefreshCw, Cpu } from 'lucide-react';
import { isAndroid } from '../lib/inference';
import type { LocalModelStatus } from '../types';

interface OllamaStatusProps {
  status: 'checking' | 'connected' | 'disconnected';
  activeModel: string;
  onRetry: () => void;
  localStatus?: LocalModelStatus;
}

export function OllamaStatus({ status, activeModel, onRetry, localStatus = 'unloaded' }: OllamaStatusProps) {
  const [showSetup, setShowSetup] = useState(false);

  if (isAndroid()) {
    const localPill = {
      ready: {
        bg: 'rgba(16,185,129,0.1)',
        color: '#059669',
        icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />,
        label: 'AI Lokal Siap',
      },
      loading: {
        bg: 'rgba(99,102,241,0.1)',
        color: '#4F46E5',
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        label: 'Memuat Lokal',
      },
      error: {
        bg: 'rgba(239,68,68,0.1)',
        color: '#DC2626',
        icon: <RefreshCw className="w-3 h-3" />,
        label: 'Lokal Gagal',
      },
      unloaded: {
        bg: 'rgba(100,116,139,0.1)',
        color: '#475569',
        icon: <Cpu className="w-3 h-3" />,
        label: 'Lokal Belum Siap',
      },
    }[localStatus];

    return (
      <motion.button
        onClick={() => (localStatus === 'error' || localStatus === 'unloaded') && onRetry()}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium transition-colors"
        style={{
          background: localPill.bg,
          color: localPill.color,
          cursor: localStatus === 'error' || localStatus === 'unloaded' ? 'pointer' : 'default',
        }}
      >
        {localPill.icon}
        {localPill.label}
      </motion.button>
    );
  }

  const pillStyle = {
    connected: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    disconnected: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
    checking: { bg: 'rgba(100,116,139,0.1)', color: '#475569' },
  }[status];

  return (
    <>
      <motion.button
        onClick={() => status === 'disconnected' && setShowSetup(true)}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium transition-colors"
        style={{ background: pillStyle.bg, color: pillStyle.color, cursor: status === 'disconnected' ? 'pointer' : 'default' }}
      >
        {status === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'connected' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><Wifi className="w-3 h-3" /><span className="max-w-[100px] truncate">{activeModel}</span></>}
        {status === 'disconnected' && <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><WifiOff className="w-3 h-3" />Offline</>}
      </motion.button>

      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowSetup(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="glass-strong rounded-glass-lg w-full max-w-sm p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">AI sedang offline</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Hubungi Bapak/Ibu guru untuk mengaktifkan komputer AI.
                  </p>
                </div>
                <button
                  onClick={() => setShowSetup(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-3"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="glass rounded-glass px-4 py-3 mb-5 border-l-2 border-indigo-300">
                <p className="text-sm text-slate-600">
                  Minta bantuan guru untuk menghidupkan fitur AI di komputer ini.
                </p>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onRetry(); setShowSetup(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Lagi
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSetup(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 glass"
                >
                  Tutup
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
