import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, X, ChevronRight } from 'lucide-react';
import { isAndroid } from '../lib/inference';

interface OllamaStatusProps {
  status: 'checking' | 'connected' | 'disconnected';
  activeModel: string;
  onRetry: () => void;
}

export function OllamaStatus({ status, activeModel, onRetry }: OllamaStatusProps) {
  const [showSetup, setShowSetup] = useState(false);

  // On Android, wllama is always active — show a simple green pill
  if (isAndroid()) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-comic font-semibold"
        style={{
          backgroundColor: '#dcfce7',
          color: '#15803d',
          boxShadow: '0 3px 0 #15803d40, 0 4px 8px rgba(0,0,0,0.08)',
        }}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>AI Lokal Aktif 🟢</span>
      </div>
    );
  }

  return (
    <>
      <motion.button
        onClick={() => {
          if (status === 'disconnected') setShowSetup(true);
        }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-comic font-semibold transition-all"
        style={{
          backgroundColor:
            status === 'connected' ? '#dcfce7' :
            status === 'disconnected' ? '#fee2e2' : '#f1f5f9',
          color:
            status === 'connected' ? '#15803d' :
            status === 'disconnected' ? '#dc2626' : '#64748b',
          boxShadow:
            status === 'connected' ? '0 3px 0 #15803d40, 0 4px 8px rgba(0,0,0,0.08)' :
            status === 'disconnected' ? '0 3px 0 #dc262640, 0 4px 8px rgba(0,0,0,0.08)' :
            '0 3px 0 #94a3b840, 0 4px 8px rgba(0,0,0,0.08)',
          cursor: status === 'disconnected' ? 'pointer' : 'default',
        }}
      >
        {status === 'checking' && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Menghubungkan...</span>
          </>
        )}
        {status === 'connected' && (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <Wifi className="w-3.5 h-3.5" />
            <span className="max-w-[120px] truncate">{activeModel}</span>
          </>
        )}
        {status === 'disconnected' && (
          <>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <WifiOff className="w-3.5 h-3.5" />
            <span>AI Offline</span>
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowSetup(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-md"
              style={{
                backgroundColor: 'white',
                borderRadius: '32px',
                padding: '32px',
                boxShadow: '0 8px 0 #1d4ed840, 0 20px 40px rgba(0,0,0,0.2)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-4xl mb-2">🤖</div>
                  <h2
                    className="text-xl font-baloo font-bold"
                    style={{ color: '#1E293B' }}
                  >
                    PintarAI sedang offline
                  </h2>
                  <p className="text-sm font-comic mt-1" style={{ color: '#64748b' }}>
                    Hubungi Bapak/Ibu guru untuk mengaktifkan komputer AI.
                  </p>
                </div>
                <button
                  onClick={() => setShowSetup(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" style={{ color: '#64748b' }} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ backgroundColor: '#EFF6FF' }}
                >
                  <span className="text-3xl">👩‍🏫</span>
                  <p className="text-sm font-comic" style={{ color: '#1E293B' }}>
                    Minta bantuan guru untuk menghidupkan fitur AI di komputer ini.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95, y: 4 }}
                  onClick={() => { onRetry(); setShowSetup(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-button font-baloo font-bold text-white"
                  style={{
                    backgroundColor: '#2563EB',
                    boxShadow: '0 6px 0 #1d4ed8, 0 8px 16px rgba(37,99,235,0.3)',
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                  Coba Lagi
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95, y: 4 }}
                  onClick={() => setShowSetup(false)}
                  className="flex-1 py-3 rounded-button font-baloo font-bold"
                  style={{
                    backgroundColor: '#F8FAFC',
                    color: '#64748b',
                    boxShadow: '0 6px 0 #cbd5e1, 0 8px 16px rgba(0,0,0,0.08)',
                  }}
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
