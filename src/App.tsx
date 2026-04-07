import { useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useOllama } from './hooks/useOllama';
import { Subject } from './types';
import { isAndroid } from './lib/inference';
import { ModelLoader } from './components/ModelLoader';

const ChatInterface = lazy(() =>
  import('./components/ChatInterface').then(m => ({ default: m.ChatInterface }))
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

const pageTransition = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 28,
};

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'chat'>('welcome');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const { status, activeModel, retry } = useOllama();
  // Android: show model loader until wllama is ready; desktop: always ready
  const [modelReady, setModelReady] = useState(!isAndroid());
  const [modelError, setModelError] = useState<string | null>(null);

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

  // Android: show loading screen until model is ready
  if (isAndroid() && !modelReady) {
    if (modelError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Baloo 2', system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Gagal Memuat AI</h2>
          <p style={{ color: '#64748b', textAlign: 'center' }}>{modelError}</p>
        </div>
      );
    }
    return (
      <ModelLoader
        onReady={() => setModelReady(true)}
        onError={(err) => setModelError(err)}
      />
    );
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
                <div
                  className="flex items-center justify-center h-screen"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-4 border-t-transparent"
                    style={{ borderColor: '#2563EB', borderTopColor: 'transparent' }}
                  />
                </div>
              }
            >
              {selectedSubject && (
                <ChatInterface
                  subject={selectedSubject}
                  onBack={handleBack}
                  ollamaStatus={status}
                  activeModel={activeModel}
                  onRetry={retry}
                />
              )}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
