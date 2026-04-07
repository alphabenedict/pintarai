import { Subject } from './types';

export const SUBJECTS: Subject[] = [
  {
    id: 'matematika',
    name: 'Matematika',
    icon: 'Calculator',
    emoji: '🔢',
    color: '#1d4ed8',
    bgColor: '#dbeafe',
    shadowColor: '#1e3a8a',
    description: 'Angka, rumus, dan logika',
  },
  {
    id: 'ipa',
    name: 'IPA',
    icon: 'Microscope',
    emoji: '🔬',
    color: '#16a34a',
    bgColor: '#dcfce7',
    shadowColor: '#15803d',
    description: 'Sains dan alam sekitar',
  },
  {
    id: 'bahasa-indonesia',
    name: 'Bahasa Indonesia',
    icon: 'BookOpen',
    emoji: '📖',
    color: '#dc2626',
    bgColor: '#fee2e2',
    shadowColor: '#991b1b',
    description: 'Membaca, menulis, tata bahasa',
  },
  {
    id: 'bahasa-inggris',
    name: 'Bahasa Inggris',
    icon: 'Languages',
    emoji: '🌐',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    shadowColor: '#6d28d9',
    description: 'English learning',
  },
  {
    id: 'ips',
    name: 'IPS',
    icon: 'Globe',
    emoji: '🗺️',
    color: '#d97706',
    bgColor: '#fef3c7',
    shadowColor: '#b45309',
    description: 'Sejarah, geografi, ekonomi',
  },
  {
    id: 'pkn',
    name: 'PKN',
    icon: 'Flag',
    emoji: '🏛️',
    color: '#dc2626',
    bgColor: '#fee2e2',
    shadowColor: '#991b1b',
    description: 'Pancasila & kewarganegaraan',
  },
  {
    id: 'seni',
    name: 'Seni & Budaya',
    icon: 'Palette',
    emoji: '🎨',
    color: '#db2777',
    bgColor: '#fce7f3',
    shadowColor: '#be185d',
    description: 'Kreativitas dan budaya',
  },
  {
    id: 'umum',
    name: 'Tanya Bebas',
    icon: 'Sparkles',
    emoji: '💬',
    color: '#f97316',
    bgColor: '#ffedd5',
    shadowColor: '#c2410c',
    description: 'Tanya apa saja!',
  },
];

export const SUBJECT_PROMPTS: Record<string, string> = {
  'matematika': 'Tunjukkan langkah penyelesaian secara singkat.',
  'ipa': 'Jelaskan dengan analogi kehidupan sehari-hari Indonesia.',
  'bahasa-indonesia': 'Fokus tata bahasa baku dan EYD.',
  'bahasa-inggris': 'Sertakan terjemahan Indonesia jika perlu.',
  'ips': 'Kaitkan dengan konteks Indonesia.',
  'pkn': 'Hubungkan dengan Pancasila dan UUD 1945.',
  'seni': 'Apresiasi kreativitas, kaitkan budaya Indonesia.',
  'umum': 'Jawab ramah dan dorong rasa ingin tahu.',
};

export type SubjectGroup = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  subjectIds: string[];
};

export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    id: 'sains-math',
    label: 'Sains & Matematika',
    emoji: '🔬',
    color: '#1d4ed8',
    bgColor: '#dbeafe',
    subjectIds: ['matematika', 'ipa'],
  },
  {
    id: 'bahasa',
    label: 'Bahasa',
    emoji: '📖',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    subjectIds: ['bahasa-indonesia', 'bahasa-inggris'],
  },
  {
    id: 'sosial',
    label: 'Sosial & Budaya',
    emoji: '🌍',
    color: '#d97706',
    bgColor: '#fef3c7',
    subjectIds: ['ips', 'pkn', 'seni'],
  },
];
