import { motion } from 'framer-motion';

interface OwlMascotProps {
  size?: number;
  animate?: boolean;
}

export function OwlMascot({ size = 160, animate = true }: OwlMascotProps) {
  const floatVariants = {
    animate: {
      y: [0, -12, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  };

  const blinkVariants = {
    animate: {
      scaleY: [1, 0.1, 1],
      transition: {
        duration: 0.2,
        repeat: Infinity,
        repeatDelay: 3,
        ease: 'easeInOut' as const,
      },
    },
  };

  return (
    <motion.div
      variants={floatVariants}
      animate={animate ? 'animate' : undefined}
      style={{ display: 'inline-block' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="100" cy="192" rx="45" ry="8" fill="rgba(0,0,0,0.12)" />

        {/* Body - main blue */}
        <ellipse cx="100" cy="130" rx="55" ry="60" fill="#2563EB" />
        {/* Body highlight */}
        <ellipse cx="85" cy="105" rx="18" ry="25" fill="#3B82F6" opacity="0.5" />

        {/* Belly - light area */}
        <ellipse cx="100" cy="138" rx="35" ry="40" fill="#DBEAFE" />
        {/* Belly pattern stripes */}
        <path d="M82 120 Q100 118 118 120" stroke="#93C5FD" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M80 130 Q100 128 120 130" stroke="#93C5FD" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M82 140 Q100 138 118 140" stroke="#93C5FD" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Head */}
        <circle cx="100" cy="80" r="48" fill="#2563EB" />
        {/* Head highlight */}
        <ellipse cx="82" cy="62" rx="14" ry="18" fill="#3B82F6" opacity="0.45" />

        {/* Ear tufts */}
        <ellipse cx="68" cy="38" rx="12" ry="16" fill="#1d4ed8" transform="rotate(-15 68 38)" />
        <ellipse cx="132" cy="38" rx="12" ry="16" fill="#1d4ed8" transform="rotate(15 132 38)" />
        <ellipse cx="68" cy="36" rx="6" ry="9" fill="#3B82F6" transform="rotate(-15 68 36)" />
        <ellipse cx="132" cy="36" rx="6" ry="9" fill="#3B82F6" transform="rotate(15 132 36)" />

        {/* Left eye outer ring */}
        <circle cx="78" cy="82" r="22" fill="white" />
        <circle cx="78" cy="82" r="22" fill="none" stroke="#1d4ed8" strokeWidth="3" />
        {/* Right eye outer ring */}
        <circle cx="122" cy="82" r="22" fill="white" />
        <circle cx="122" cy="82" r="22" fill="none" stroke="#1d4ed8" strokeWidth="3" />

        {/* Left eye iris */}
        <circle cx="78" cy="82" r="14" fill="#F97316" />
        {/* Right eye iris */}
        <circle cx="122" cy="82" r="14" fill="#F97316" />

        {/* Eye pupils - animated blink */}
        <motion.g variants={blinkVariants} animate={animate ? 'animate' : undefined} style={{ transformOrigin: '78px 82px' }}>
          <circle cx="78" cy="82" r="8" fill="#1E293B" />
        </motion.g>
        <motion.g variants={blinkVariants} animate={animate ? 'animate' : undefined} style={{ transformOrigin: '122px 82px' }}>
          <circle cx="122" cy="82" r="8" fill="#1E293B" />
        </motion.g>

        {/* Eye shine */}
        <circle cx="83" cy="77" r="3" fill="white" />
        <circle cx="127" cy="77" r="3" fill="white" />
        <circle cx="82" cy="86" r="1.5" fill="white" opacity="0.7" />
        <circle cx="126" cy="86" r="1.5" fill="white" opacity="0.7" />

        {/* Beak */}
        <path d="M92 95 L100 108 L108 95 Q100 90 92 95Z" fill="#F97316" />
        <path d="M92 95 Q100 90 108 95" stroke="#ea6c05" strokeWidth="1.5" fill="none" />

        {/* Wings */}
        {/* Left wing */}
        <ellipse cx="52" cy="140" rx="22" ry="35" fill="#1d4ed8" transform="rotate(-15 52 140)" />
        <ellipse cx="52" cy="140" rx="13" ry="22" fill="#2563EB" transform="rotate(-15 52 140)" />
        {/* Right wing */}
        <ellipse cx="148" cy="140" rx="22" ry="35" fill="#1d4ed8" transform="rotate(15 148 140)" />
        <ellipse cx="148" cy="140" rx="13" ry="22" fill="#2563EB" transform="rotate(15 148 140)" />

        {/* Feet */}
        <ellipse cx="84" cy="186" rx="16" ry="7" fill="#F97316" transform="rotate(-10 84 186)" />
        <ellipse cx="116" cy="186" rx="16" ry="7" fill="#F97316" transform="rotate(10 116 186)" />
        {/* Toes left */}
        <path d="M72 184 Q68 178 66 182" stroke="#ea6c05" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M78 182 Q74 175 72 179" stroke="#ea6c05" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M84 183 Q82 176 80 180" stroke="#ea6c05" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Toes right */}
        <path d="M128 184 Q132 178 134 182" stroke="#ea6c05" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M122 182 Q126 175 128 179" stroke="#ea6c05" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M116 183 Q118 176 120 180" stroke="#ea6c05" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Graduation cap */}
        <rect x="62" y="34" width="76" height="8" rx="4" fill="#1E293B" />
        <rect x="82" y="26" width="36" height="10" rx="3" fill="#1E293B" />
        {/* Tassel */}
        <line x1="138" y1="38" x2="148" y2="50" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="148" cy="52" r="4" fill="#F97316" />
      </svg>
    </motion.div>
  );
}
