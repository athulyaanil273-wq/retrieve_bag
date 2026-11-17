import { cn } from '@/src/lib/utils';

export interface TagScanIllustrationProps {
  className?: string;
}

/**
 * Baggage tag helper illustration showing passengers where to locate their 10-digit claim code.
 */
export function TagScanIllustration({ className }: TagScanIllustrationProps) {
  return (
    <svg
      viewBox="0 0 260 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      role="img"
      aria-label="Sample airport baggage claim tag highlighting flight and 10-digit tag number"
    >
      {/* Tag card */}
      <rect x="20" y="16" width="220" height="108" rx="16" fill="#17254A" stroke="#C4B5FD" strokeOpacity="0.3" strokeWidth="1.5" />

      {/* Left perforation notch */}
      <circle cx="38" cy="70" r="7" fill="#0B132B" stroke="#F472B6" strokeWidth="2" />

      {/* Header bar */}
      <rect x="58" y="30" width="164" height="20" rx="6" fill="#111C3A" />
      <text x="68" y="44" fill="#C4B5FD" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600">
        BAGGAGE CLAIM TAG
      </text>
      <text x="190" y="44" fill="#F472B6" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
        AI 302
      </text>

      {/* Barcode stripes */}
      <g fill="#E2E8F0" fillOpacity="0.8">
        <rect x="60" y="60" width="3" height="26" rx="1" />
        <rect x="66" y="60" width="6" height="26" rx="1" />
        <rect x="76" y="60" width="2" height="26" rx="1" />
        <rect x="82" y="60" width="5" height="26" rx="1" />
        <rect x="91" y="60" width="3" height="26" rx="1" />
        <rect x="98" y="60" width="7" height="26" rx="1" />
        <rect x="109" y="60" width="2" height="26" rx="1" />
        <rect x="115" y="60" width="4" height="26" rx="1" />
      </g>

      {/* Highlighted 10-digit tag code */}
      <rect x="130" y="60" width="90" height="26" rx="6" fill="#F472B6" fillOpacity="0.18" stroke="#F472B6" strokeWidth="1.5" />
      <text x="139" y="77" fill="#F9A8D4" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">
        0098 441 920
      </text>

      {/* Helper footer note */}
      <text x="60" y="106" fill="#94A3B8" fontSize="9.5" fontFamily="Plus Jakarta Sans, sans-serif">
        Usually printed on your boarding pass stub
      </text>
    </svg>
  );
}
