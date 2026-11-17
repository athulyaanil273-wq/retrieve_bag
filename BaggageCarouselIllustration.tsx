import { cn } from '@/src/lib/utils';

export interface IllustrationProps {
  className?: string;
}

/**
 * Airport baggage claim carousel illustration in deep navy, pink, and lavender.
 */
export function BaggageCarouselIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 360 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      role="img"
      aria-label="Airport baggage claim carousel with passenger suitcases"
    >
      {/* Background terminal arch */}
      <rect x="24" y="18" width="312" height="126" rx="20" fill="#0B132B" stroke="#C4B5FD" strokeOpacity="0.16" />
      <path d="M126 144V64C126 50.7452 136.745 40 150 40H210C223.255 40 234 50.7452 234 64V144" fill="#17254A" />
      {/* Conveyor curtain slats */}
      <line x1="148" y1="48" x2="148" y2="128" stroke="#070D1F" strokeWidth="4" strokeLinecap="round" />
      <line x1="169" y1="44" x2="169" y2="128" stroke="#070D1F" strokeWidth="4" strokeLinecap="round" />
      <line x1="191" y1="44" x2="191" y2="128" stroke="#070D1F" strokeWidth="4" strokeLinecap="round" />
      <line x1="212" y1="48" x2="212" y2="128" stroke="#070D1F" strokeWidth="4" strokeLinecap="round" />

      {/* Carousel belt track */}
      <rect x="16" y="128" width="328" height="28" rx="14" fill="#1E2E5C" stroke="#C4B5FD" strokeOpacity="0.28" />
      <line x1="40" y1="142" x2="320" y2="142" stroke="#C4B5FD" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="10 10" />

      {/* Left lavender suitcase */}
      <g transform="translate(52 72)">
        <rect x="14" y="-12" width="18" height="14" rx="4" stroke="#C4B5FD" strokeWidth="3" />
        <rect x="0" y="0" width="46" height="56" rx="12" fill="#A78BFA" />
        <rect x="8" y="12" width="30" height="32" rx="6" fill="#C4B5FD" fillOpacity="0.35" />
        <rect x="34" y="16" width="8" height="14" rx="3" fill="#F472B6" />
      </g>

      {/* Center signature pink suitcase */}
      <g transform="translate(154 62)">
        <rect x="17" y="-14" width="20" height="16" rx="4" stroke="#F9A8D4" strokeWidth="3.5" />
        <rect x="0" y="0" width="54" height="66" rx="14" fill="#F472B6" />
        <rect x="0" y="40" width="54" height="9" fill="#C4B5FD" fillOpacity="0.45" />
        <circle cx="19" cy="24" r="3" fill="#0B132B" />
        <circle cx="35" cy="24" r="3" fill="#0B132B" />
        <path d="M23 30C25 33 29 33 31 30" stroke="#0B132B" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Right navy-slate duffel bag */}
      <g transform="translate(248 86)">
        <path d="M16 4C16 -4 40 -4 40 4" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
        <rect x="0" y="4" width="56" height="38" rx="14" fill="#314880" stroke="#C4B5FD" strokeOpacity="0.35" strokeWidth="2" />
        <rect x="18" y="4" width="20" height="38" fill="#17254A" fillOpacity="0.6" />
        <circle cx="44" cy="17" r="4" fill="#F472B6" />
      </g>
    </svg>
  );
}
