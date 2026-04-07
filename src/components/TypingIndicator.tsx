import { motion } from 'framer-motion';

export function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 },
  };

  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.15,
        repeat: Infinity,
        repeatType: 'mirror' as const,
      },
    },
  };

  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Mini owl avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
        style={{
          backgroundColor: '#2563EB',
          boxShadow: '0 3px 0 #1d4ed8, 0 4px 8px rgba(37,99,235,0.3)',
        }}
      >
        🦉
      </div>

      <motion.div
        className="flex items-center gap-2 px-5 py-4 rounded-3xl"
        style={{
          backgroundColor: 'white',
          borderRadius: '24px 24px 24px 4px',
          boxShadow: '0 6px 0 #e2e8f0, 0 8px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
        initial={{ opacity: 0, scale: 0.8, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: -10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.div
          className="flex gap-1.5"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              variants={dotVariants}
              transition={{
                duration: 0.4,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'mirror',
                delay: i * 0.15,
              }}
              className="block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: '#2563EB' }}
            />
          ))}
        </motion.div>
        <span className="text-xs font-comic ml-1" style={{ color: '#64748b' }}>
          PintarAI sedang berpikir...
        </span>
      </motion.div>
    </div>
  );
}
