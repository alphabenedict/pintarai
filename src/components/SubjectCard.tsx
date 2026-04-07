import { motion } from 'framer-motion';
import {
  Calculator, BookOpen, Microscope, Globe, Flag,
  Languages, Palette, Sparkles
} from 'lucide-react';
import { Subject } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator, BookOpen, Microscope, Globe, Flag, Languages, Palette, Sparkles,
};

interface SubjectCardProps {
  subject: Subject;
  onClick: (subject: Subject) => void;
}

export function SubjectCard({ subject, onClick }: SubjectCardProps) {
  const Icon = iconMap[subject.icon] ?? Sparkles;

  return (
    <motion.button
      onClick={() => onClick(subject)}
      whileTap={{ scale: 0.96 }}
      className="w-full text-left flex flex-col gap-2.5 p-3.5 rounded-glass-lg cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.8)',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.75)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
    >
      {/* Icon circle with subject color */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: subject.color + '18', color: subject.color }}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 leading-tight">{subject.name}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{subject.description}</p>
      </div>
    </motion.button>
  );
}
