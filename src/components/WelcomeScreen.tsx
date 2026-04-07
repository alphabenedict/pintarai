import { motion } from 'framer-motion';
import { OwlMascot } from './OwlMascot';
import { SubjectCard } from './SubjectCard';
import { OllamaStatus } from './OllamaStatus';
import { SUBJECTS } from '../constants';
import { Subject } from '../types';

interface WelcomeScreenProps {
  onSubjectSelect: (subject: Subject) => void;
  ollamaStatus: 'checking' | 'connected' | 'disconnected';
  activeModel: string;
  onRetry: () => void;
}

function FloatingBlob({ cx, cy, r, color, delay }: { cx: number; cy: number; r: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full opacity-30 pointer-events-none"
      style={{
        width: r * 2,
        height: r * 2,
        left: `${cx}%`,
        top: `${cy}%`,
        backgroundColor: color,
        filter: 'blur(40px)',
        transform: 'translate(-50%, -50%)',
      }}
      animate={{
        y: [0, -20, 0],
        x: [0, 10, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6 + delay,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}

export function WelcomeScreen({ onSubjectSelect, ollamaStatus, activeModel, onRetry }: WelcomeScreenProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
    },
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #FFF7ED 100%)',
      }}
    >
      {/* Decorative floating blobs */}
      <FloatingBlob cx={10} cy={15} r={120} color="#2563EB" delay={0} />
      <FloatingBlob cx={85} cy={10} r={100} color="#F97316" delay={1.5} />
      <FloatingBlob cx={70} cy={70} r={150} color="#3B82F6" delay={0.8} />
      <FloatingBlob cx={20} cy={80} r={100} color="#22C55E" delay={2} />
      <FloatingBlob cx={50} cy={40} r={80} color="#7C3AED" delay={3} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Mascot */}
          <motion.div variants={itemVariants}>
            <OwlMascot size={160} animate />
          </motion.div>

          {/* App title */}
          <motion.div variants={itemVariants} className="text-center mt-4 mb-2">
            <h1
              className="font-baloo font-bold text-6xl sm:text-7xl leading-none"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 4px rgba(37,99,235,0.2))',
              }}
            >
              PintarAI
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.div variants={itemVariants}>
            <div
              className="px-6 py-3 rounded-outer font-comic font-bold text-lg sm:text-xl text-center"
              style={{
                background: 'linear-gradient(135deg, #F97316, #FBBF24)',
                color: 'white',
                boxShadow: '0 6px 0 #c2410c, 0 10px 20px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                borderRadius: '24px',
              }}
            >
              Teman Belajarmu yang Cerdas! 🦉
            </div>
          </motion.div>

          {/* Offline notice when disconnected */}
          {ollamaStatus === 'disconnected' && (
            <motion.div
              variants={itemVariants}
              className="mt-4 w-full max-w-md"
            >
              <div
                className="p-4 rounded-2xl flex items-center gap-3"
                style={{
                  backgroundColor: '#fff7ed',
                  border: '2px solid #fed7aa',
                  boxShadow: '0 4px 0 #fdba7440, 0 6px 12px rgba(0,0,0,0.06)',
                }}
              >
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-baloo font-bold text-sm" style={{ color: '#9a3412' }}>
                    AI Sedang Offline
                  </p>
                  <p className="font-comic text-xs" style={{ color: '#c2410c' }}>
                    Hubungi guru untuk mengaktifkan AI, atau klik status di bawah untuk panduan setup.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Subject selector heading */}
          <motion.div variants={itemVariants} className="mt-10 mb-4 text-center">
            <p className="font-baloo font-bold text-2xl" style={{ color: '#1E293B' }}>
              Pilih mata pelajaran untuk mulai belajar:
            </p>
          </motion.div>

          {/* Subject grid */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full"
          >
            {SUBJECTS.map((subject, index) => (
              <motion.div key={subject.id} variants={itemVariants} custom={index}>
                <SubjectCard subject={subject} onClick={onSubjectSelect} />
              </motion.div>
            ))}
          </motion.div>

          {/* Ollama status at bottom */}
          <motion.div variants={itemVariants} className="mt-8 flex items-center gap-3">
            <span className="font-comic text-sm" style={{ color: '#64748b' }}>
              Status AI:
            </span>
            <OllamaStatus
              status={ollamaStatus}
              activeModel={activeModel}
              onRetry={onRetry}
            />
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="mt-6 font-comic text-xs text-center"
            style={{ color: '#94a3b8' }}
          >
            PintarAI berjalan 100% offline di perangkat lokal · Aman dan privat untuk siswa Indonesia
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
