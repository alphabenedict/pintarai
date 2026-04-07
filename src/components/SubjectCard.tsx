import { motion } from 'framer-motion';
import {
  Calculator, BookOpen, Microscope, Globe, Flag,
  Languages, Palette, Sparkles
} from 'lucide-react';
import { Subject } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  BookOpen,
  Microscope,
  Globe,
  Flag,
  Languages,
  Palette,
  Sparkles,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      whileTap={{ scale: 0.95, y: 4 }}
      className="w-full text-left p-5 flex flex-col items-center gap-3 cursor-pointer"
      style={{
        backgroundColor: subject.bgColor,
        borderRadius: '32px',
        boxShadow: `0 8px 0 ${subject.shadowColor}40, 0 12px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)`,
        border: `2px solid ${subject.color}20`,
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <motion.div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          backgroundColor: subject.color,
          boxShadow: `0 4px 0 ${subject.shadowColor}, 0 6px 12px ${subject.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        <Icon className="w-7 h-7 text-white" />
      </motion.div>

      <div className="text-center">
        <p
          className="font-baloo font-bold text-base leading-tight"
          style={{ color: '#1E293B' }}
        >
          {subject.name}
        </p>
        <p
          className="font-comic text-xs mt-1 leading-snug"
          style={{ color: subject.color }}
        >
          {subject.description}
        </p>
      </div>
    </motion.button>
  );
}
