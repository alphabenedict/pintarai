import { SegmentedProgress } from '@/components/ui/progress-bar';

interface ModelLoaderProps {
  progress: number;
  status: string;
}

export function ModelLoader({ progress, status }: ModelLoaderProps) {
  return (
    <div
      className="safe-top safe-bottom min-h-[100dvh] flex flex-col items-center justify-center p-8"
      style={{
        background: 'linear-gradient(135deg, #E0E7FF 0%, #EFF6FF 50%, #E0F2FE 100%)',
      }}
    >
      <div className="glass-strong rounded-3xl px-8 py-10 max-w-sm w-full flex flex-col items-center">
        {/* Logo */}
        <div
          className="w-[72px] h-[72px] rounded-3xl flex items-center justify-center text-white font-extrabold text-[22px]"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
            boxShadow: '0 12px 24px rgba(79,70,229,0.2)',
          }}
        >
          AI
        </div>

        <h1 className="font-brand text-[32px] font-extrabold mt-4 mb-1 text-primary-dark">
          PintarAI
        </h1>

        <SegmentedProgress
          value={progress}
          label={status}
          segments={20}
          showPercentage={true}
          showDemo={false}
          className="w-full"
        />

        <p className="text-text-muted/60 text-xs mt-4 text-center">
          {progress < 100
            ? 'Unduhan pertama \u00b12.5GB \u2014 pastikan terhubung WiFi. Setelah itu AI bekerja offline.'
            : 'AI siap!'}
        </p>
      </div>
    </div>
  );
}
