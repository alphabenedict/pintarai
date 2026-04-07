import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Subject } from './types';
import { ModelLoader } from './components/ModelLoader';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useOllama } from './hooks/useOllama';
import { isGroqReady } from './lib/groq';
import { isAndroid, prepareInference } from './lib/inference';

const LazyChatInterface = lazy(() =>
  import('./components/ChatInterface').then(module => ({ default: module.ChatInterface }))
);

const pageVariants = {
  enterFromRight: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
  },
  enterFromLeft: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
  },
};

const pageTransition = { type: 'spring' as const, stiffness: 280, damping: 28 };

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'chat'>('welcome');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [groqEnabled, setGroqEnabled] = useState(() => isGroqReady());
  const {
    status,
    activeModel,
    retry,
    localStatus,
    localProgress,
    localStatusText,
    localError,
  } = useOllama();

  useEffect(() => {
    if (!isAndroid()) return;

    prepareInference().catch(err => {
      console.warn('[PintarAI] Background local preload failed:', err);
    });
  }, []);

  useEffect(() => {
    const syncGroq = () => setGroqEnabled(isGroqReady());
    window.addEventListener('online', syncGroq);
    window.addEventListener('offline', syncGroq);
    window.addEventListener('storage', syncGroq);
    return () => {
      window.removeEventListener('online', syncGroq);
      window.removeEventListener('offline', syncGroq);
      window.removeEventListener('storage', syncGroq);
    };
  }, []);

  const handleGroqChange = () => {
    setGroqEnabled(isGroqReady());
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setDirection('forward');
    setCurrentView('chat');
  };

  const handleBack = () => {
    setDirection('back');
    setCurrentView('welcome');
  };

  const variants = direction === 'forward' ? pageVariants.enterFromRight : pageVariants.enterFromLeft;
  const hasImmediateBackend = groqEnabled || localStatus === 'ready';

  if (isAndroid() && !hasImmediateBackend) {
    if (localStatus === 'error') {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'Inter, system-ui, sans-serif',
            background: 'linear-gradient(135deg, #E0E7FF, #EFF6FF, #E0F2FE)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <h2 style={{ color: '#DC2626', marginBottom: 8, fontWeight: 600 }}>Gagal Memuat AI Lokal</h2>
          <p style={{ color: '#64748B', textAlign: 'center', fontSize: 14 }}>{localError}</p>
        </div>
      );
    }

    return <ModelLoader progress={localProgress} status={localStatusText} />;
  }

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100dvh' }}>
      <AnimatePresence mode="wait">
        {currentView === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={pageTransition}
            style={{ position: 'absolute', inset: 0 }}
          >
            <WelcomeScreen
              onSubjectSelect={handleSubjectSelect}
              ollamaStatus={status}
              activeModel={activeModel}
              onRetry={retry}
              onGroqChange={handleGroqChange}
              localStatus={localStatus}
            />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={pageTransition}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-screen">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 rounded-full border-4"
                    style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }}
                  />
                </div>
              }
            >
              {selectedSubject && (
                <LazyChatInterface
                  subject={selectedSubject}
                  onBack={handleBack}
                  ollamaStatus={status}
                  activeModel={activeModel}
                  onRetry={retry}
                  localStatus={localStatus}
                />
              )}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
