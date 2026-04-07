import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Settings, Sparkles, Zap } from 'lucide-react';
import { SUBJECT_GROUPS, SUBJECTS } from '../constants';
import { isGroqReady } from '../lib/groq';
import { isAndroid } from '../lib/inference';
import type { LocalModelStatus, Subject } from '../types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/interfaces-collapsible';
import { GroqSetup } from './GroqSetup';
import { OllamaStatus } from './OllamaStatus';
import { SubjectCard } from './SubjectCard';

interface WelcomeScreenProps {
  onSubjectSelect: (subject: Subject) => void;
  ollamaStatus: 'checking' | 'connected' | 'disconnected';
  activeModel: string;
  onRetry: () => void;
  onGroqChange: () => void;
  localStatus: LocalModelStatus;
}

export function WelcomeScreen({
  onSubjectSelect,
  ollamaStatus,
  activeModel,
  onRetry,
  onGroqChange,
  localStatus,
}: WelcomeScreenProps) {
  const prefersReduced = useReducedMotion();
  const [showGroqSetup, setShowGroqSetup] = useState(false);
  const [groqActive, setGroqActive] = useState(isGroqReady());
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'sains-math': true,
    bahasa: true,
    sosial: false,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tanyaBebas = SUBJECTS.find(subject => subject.id === 'umum')!;

  const handleGroqSaved = () => {
    setGroqActive(isGroqReady());
    onGroqChange();
  };

  useEffect(() => {
    const syncGroq = () => setGroqActive(isGroqReady());
    window.addEventListener('online', syncGroq);
    window.addEventListener('offline', syncGroq);
    window.addEventListener('storage', syncGroq);
    return () => {
      window.removeEventListener('online', syncGroq);
      window.removeEventListener('offline', syncGroq);
      window.removeEventListener('storage', syncGroq);
    };
  }, []);

  const fadeUp = (delay = 0) => ({
    initial: prefersReduced ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut', delay },
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10 safe-top safe-bottom">
        <motion.div {...fadeUp(0)} className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', boxShadow: '0 10px 24px rgba(79,70,229,0.18)' }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-brand font-bold text-3xl tracking-tight leading-none" style={{ color: '#4F46E5' }}>
                PintarAI
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Teman belajarmu yang cerdas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {groqActive && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}
              >
                <Zap className="w-3 h-3" />
                Cloud
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowGroqSetup(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center glass"
              aria-label="Pengaturan AI"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </motion.button>
          </div>
        </motion.div>

        <GroqSetup
          open={showGroqSetup}
          onClose={() => setShowGroqSetup(false)}
          onSaved={handleGroqSaved}
        />

        {!groqActive && !isAndroid() && ollamaStatus === 'disconnected' && (
          <motion.div {...fadeUp(0.05)} className="mb-4">
            <div className="glass rounded-glass px-4 py-3 flex items-center gap-3 border-l-2 border-amber-400">
              <span className="text-amber-500 text-sm font-medium">AI sedang offline</span>
              <span className="text-slate-400 text-xs">Hubungi guru untuk mengaktifkan</span>
            </div>
          </motion.div>
        )}

        {groqActive && isAndroid() && localStatus === 'loading' && (
          <motion.div {...fadeUp(0.05)} className="mb-4">
            <div className="glass rounded-glass px-4 py-3 flex items-center gap-3 border-l-2 border-indigo-400">
              <span className="text-indigo-500 text-sm font-medium">AI lokal sedang dipanaskan</span>
              <span className="text-slate-400 text-xs">Cloud aktif, fallback offline disiapkan</span>
            </div>
          </motion.div>
        )}

        <motion.p {...fadeUp(0.08)} className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Pilih mata pelajaran
        </motion.p>

        <div className="flex flex-col gap-3">
          {SUBJECT_GROUPS.map((group, index) => {
            const groupSubjects = SUBJECTS.filter(subject => group.subjectIds.includes(subject.id));
            const isOpen = openGroups[group.id] ?? true;

            return (
              <motion.div key={group.id} {...fadeUp(0.1 + index * 0.05)}>
                <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                  <div className="glass rounded-glass overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{group.emoji}</span>
                          <span className="text-sm font-semibold text-slate-700">{group.label}</span>
                          <span className="text-xs text-slate-400">{groupSubjects.length} mapel</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </motion.div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-white/60 px-3 py-3 grid grid-cols-2 gap-2">
                        {groupSubjects.map(subject => (
                          <SubjectCard key={subject.id} subject={subject} onClick={onSubjectSelect} />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            );
          })}

          <motion.div {...fadeUp(0.25)}>
            <motion.button
              onClick={() => onSubjectSelect(tanyaBebas)}
              whileTap={{ scale: 0.98 }}
              className="w-full glass rounded-glass px-4 py-3.5 flex items-center justify-between"
              style={{ borderLeft: '3px solid #6366F1' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{tanyaBebas.emoji}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-700">Tanya Bebas</p>
                  <p className="text-xs text-slate-400">Tanya apa saja ke PintarAI</p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </motion.button>
          </motion.div>
        </div>

        <motion.div {...fadeUp(0.3)} className="mt-8 flex items-center justify-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <OllamaStatus
            status={ollamaStatus}
            activeModel={activeModel}
            onRetry={onRetry}
            localStatus={localStatus}
          />
        </motion.div>

        <motion.p {...fadeUp(0.35)} className="text-center text-xs text-slate-400 mt-3">
          Berjalan 100% offline - Aman untuk siswa Indonesia
        </motion.p>
      </div>
    </div>
  );
}
