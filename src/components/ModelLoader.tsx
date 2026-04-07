import { motion } from 'framer-motion';

interface ModelLoaderProps {
  progress: number;
  status: string;
}

export function ModelLoader({ progress, status }: ModelLoaderProps) {
  return (
    <div
      className="safe-top safe-bottom"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #E0E7FF 0%, #EFF6FF 50%, #E0F2FE 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.85)',
          borderRadius: 24,
          padding: '40px 32px',
          maxWidth: 320,
          width: '100%',
          boxShadow: '0 8px 32px rgba(99,102,241,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
            boxShadow: '0 12px 24px rgba(79,70,229,0.2)',
            color: 'white',
            fontWeight: 800,
            fontSize: 22,
          }}
        >
          AI
        </div>

        <h1
          style={{
            fontFamily: "'Baloo 2', cursive",
            fontSize: 32,
            fontWeight: 800,
            margin: '16px 0 4px',
            color: '#4F46E5',
          }}
        >
          PintarAI
        </h1>

        <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 28px', textAlign: 'center' }}>
          {status}
        </p>

        <div
          style={{
            width: '100%',
            height: 6,
            background: 'rgba(99,102,241,0.12)',
            borderRadius: 9999,
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #818CF8, #6366F1)',
              borderRadius: 9999,
            }}
          />
        </div>

        <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
          {progress < 100
            ? 'Menyiapkan AI lokal... unduhan pertama bisa memakan waktu beberapa menit.'
            : 'AI siap!'}
        </p>
      </div>
    </div>
  );
}
