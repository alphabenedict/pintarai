import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { prepareInference } from '../lib/inference';

interface ModelLoaderProps {
  onReady: () => void;
  onError: (err: string) => void;
}

export function ModelLoader({ onReady, onError }: ModelLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Mempersiapkan PintarAI...');

  useEffect(() => {
    prepareInference(({ progress, status }) => {
      setProgress(progress);
      setStatus(status);
    })
      .then(onReady)
      .catch(err => onError(err?.message ?? 'Gagal memuat AI'));
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Baloo 2', system-ui, sans-serif",
        padding: '24px',
      }}
    >
      {/* Owl mascot bounce */}
      <motion.div
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 80, marginBottom: 24 }}
      >
        🦉
      </motion.div>

      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          margin: '0 0 8px',
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        PintarAI
      </h1>

      <p
        style={{
          color: '#64748b',
          fontSize: 16,
          marginBottom: 32,
          textAlign: 'center',
        }}
      >
        {status}
      </p>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          height: 12,
          background: '#E2E8F0',
          borderRadius: 9999,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
        }}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #2563EB, #7C3AED)',
            borderRadius: 9999,
          }}
        />
      </div>

      <p
        style={{
          color: '#94a3b8',
          fontSize: 13,
          marginTop: 16,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {'Memuat model AI ke dalam memori...\nIni hanya terjadi sekali saat pertama dibuka.'}
      </p>
    </div>
  );
}
