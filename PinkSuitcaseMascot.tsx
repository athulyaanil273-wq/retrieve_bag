import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export type MascotMood = 'greeting' | 'searching' | 'matched' | 'helper';

export interface PinkSuitcaseMascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
  label?: string;
}

const SIZE_MAP = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
  xl: 'w-44 h-44',
} as const;

export function PinkSuitcaseMascot({
  mood = 'greeting',
  size = 'lg',
  animate = true,
  className,
  label = 'Retrieve Bag pink suitcase mascot',
}: PinkSuitcaseMascotProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldFloat = animate && !prefersReducedMotion;

  return (
    <motion.div
      className={cn('relative inline-flex items-center justify-center select-none', SIZE_MAP[size], className)}
      animate={
        shouldFloat
          ? {
              y: [0, -5, 0],
            }
          : undefined
      }
      transition={
        shouldFloat
          ? {
              duration: 3.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : undefined
      }
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_14px_24px_rgba(7,13,31,0.55)]"
      >
        {/* Subtle ground shadow */}
        <ellipse cx="90" cy="166" rx="46" ry="7" fill="#070D1F" fillOpacity="0.6" />

        {/* Telescopic handle */}
        <path
          d="M68 48V28C68 23.5817 71.5817 20 76 20H104C108.418 20 112 23.5817 112 28V48"
          stroke="#C4B5FD"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <rect x="64" y="16" width="52" height="10" rx="5" fill="#A78BFA" />
        <rect x="74" y="18.5" width="32" height="3.5" rx="1.75" fill="#DDD6FE" />

        {/* Top carry grip */}
        <rect x="77" y="42" width="26" height="8" rx="4" fill="#DB2777" />

        {/* Spinner wheels */}
        <rect x="48" y="148" width="14" height="14" rx="5" fill="#1E293B" />
        <circle cx="55" cy="155" r="3" fill="#C4B5FD" />
        <rect x="118" y="148" width="14" height="14" rx="5" fill="#1E293B" />
        <circle cx="125" cy="155" r="3" fill="#C4B5FD" />

        {/* Main rounded pink suitcase shell */}
        <rect x="36" y="48" width="108" height="104" rx="26" fill="#F472B6" />
        {/* Soft upper highlight */}
        <path
          d="M62 51H118C130.703 51 141 61.2975 141 74V78C141 65.2975 130.703 55 118 55H62C49.2975 55 39 65.2975 39 78V74C39 61.2975 49.2975 51 62 51Z"
          fill="#FBCFE8"
          fillOpacity="0.6"
        />

        {/* Lavender corner bumpers */}
        <path d="M36 70C36 57.8497 45.8497 48 58 48H62V58C52.0589 58 44 66.0589 44 76V78H36V70Z" fill="#C4B5FD" />
        <path d="M144 70C144 57.8497 134.15 48 122 48H118V58C127.941 58 136 66.0589 136 76V78H144V70Z" fill="#C4B5FD" />

        {/* Vertical ribbed suitcase grooves */}
        <line x1="56" y1="66" x2="56" y2="136" stroke="#DB2777" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
        <line x1="124" y1="66" x2="124" y2="136" stroke="#DB2777" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />

        {/* Lavender luggage belt across lower third */}
        <rect x="36" y="116" width="108" height="14" fill="#A78BFA" fillOpacity="0.35" />
        <rect x="78" y="114" width="24" height="18" rx="6" fill="#C4B5FD" />
        <rect x="83" y="119" width="14" height="8" rx="3" fill="#0B132B" />

        {/* Cute face container */}
        {mood === 'matched' ? (
          <>
            {/* Happy curved eyes */}
            <path d="M67 89C69.5 84 74.5 84 77 89" stroke="#0B132B" strokeWidth="4" strokeLinecap="round" />
            <path d="M103 89C105.5 84 110.5 84 113 89" stroke="#0B132B" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : mood === 'searching' ? (
          <>
            {/* Curious focused eyes */}
            <circle cx="72" cy="87" r="5.5" fill="#0B132B" />
            <circle cx="70.5" cy="85" r="2" fill="#FFFFFF" />
            <circle cx="108" cy="87" r="5.5" fill="#0B132B" />
            <circle cx="106.5" cy="85" r="2" fill="#FFFFFF" />
            {/* Tiny lavender magnifying ring */}
            <circle cx="122" cy="96" r="10" fill="#17254A" fillOpacity="0.85" stroke="#C4B5FD" strokeWidth="3.5" />
            <line x1="129" y1="103" x2="136" y2="110" stroke="#C4B5FD" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Friendly bright eyes */}
            <circle cx="72" cy="88" r="5.5" fill="#0B132B" />
            <circle cx="70" cy="86" r="2" fill="#FFFFFF" />
            <circle cx="108" cy="88" r="5.5" fill="#0B132B" />
            <circle cx="106" cy="86" r="2" fill="#FFFFFF" />
          </>
        )}

        {/* Rosy cheeks */}
        <ellipse cx="61" cy="97" rx="5.5" ry="3.2" fill="#DB2777" fillOpacity="0.45" />
        <ellipse cx="119" cy="97" rx="5.5" ry="3.2" fill="#DB2777" fillOpacity="0.45" />

        {/* Mouth expression */}
        {mood === 'searching' ? (
          <circle cx="90" cy="100" r="3.5" fill="#0B132B" />
        ) : mood === 'helper' ? (
          <path d="M83 98C86 101.5 94 101.5 97 98" stroke="#0B132B" strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          <path d="M81 97C84.5 104 95.5 104 99 97" stroke="#0B132B" strokeWidth="3.8" strokeLinecap="round" />
        )}

        {/* Dangling airport luggage tag on side */}
        <g transform="translate(136 74) rotate(12)">
          <line x1="0" y1="4" x2="10" y2="10" stroke="#DDD6FE" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="6" y="8" width="18" height="26" rx="5" fill="#17254A" stroke="#C4B5FD" strokeWidth="2" />
          <circle cx="15" cy="13" r="2" fill="#F472B6" />
          <line x1="10" y1="20" x2="20" y2="20" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="26" x2="17" y2="26" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Waving hand when greeting */}
        {mood === 'greeting' && (
          <g transform="translate(22 86)">
            <path
              d="M14 14C6 12 2 5 6 1C9 -2 13 3 16 7"
              fill="#F9A8D4"
              stroke="#0B132B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Check badge on tag when matched */}
        {mood === 'matched' && (
          <g transform="translate(122 36)">
            <circle cx="14" cy="14" r="14" fill="#34D399" />
            <path
              d="M8.5 14.5L12.2 18.2L19.8 10.5"
              stroke="#070D1F"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
