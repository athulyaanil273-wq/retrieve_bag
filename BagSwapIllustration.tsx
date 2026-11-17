import { cn } from '@/src/lib/utils';

export interface BagSwapIllustrationProps {
  className?: string;
}

/**
 * Illustration depicting two similar bags compared side-by-side to resolve accidental exchanges.
 */
export function BagSwapIllustration({ className }: BagSwapIllustrationProps) {
  return (
    <svg
      viewBox="0 0 280 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      role="img"
      aria-label="Two similar suitcases with exchange comparison arrows"
    >
      {/* Left suitcase (Passenger A) */}
      <g transform="translate(26 28)">
        <rect x="20" y="-12" width="22" height="14" rx="4" stroke="#C4B5FD" strokeWidth="3" />
        <rect x="0" y="0" width="62" height="84" rx="16" fill="#223463" stroke="#C4B5FD" strokeWidth="2" />
        <rect x="12" y="20" width="38" height="44" rx="8" fill="#17254A" />
        <rect x="46" y="14" width="12" height="20" rx="4" fill="#F472B6" />
        <text x="19" y="46" fill="#DDD6FE" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">
          TAG A
        </text>
      </g>

      {/* Exchange bi-directional arcs */}
      <path
        d="M104 56C122 40 158 40 176 56"
        stroke="#F472B6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M170 48L177 57L167 59" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      <path
        d="M176 86C158 102 122 102 104 86"
        stroke="#C4B5FD"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M110 94L103 85L113 83" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Center match icon */}
      <circle cx="140" cy="71" r="14" fill="#111C3A" stroke="#FBBF24" strokeWidth="2" />
      <path d="M135 71H145M140 66V76" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />

      {/* Right suitcase (Passenger B) */}
      <g transform="translate(192 28)">
        <rect x="20" y="-12" width="22" height="14" rx="4" stroke="#F472B6" strokeWidth="3" />
        <rect x="0" y="0" width="62" height="84" rx="16" fill="#223463" stroke="#F472B6" strokeWidth="2" />
        <rect x="12" y="20" width="38" height="44" rx="8" fill="#17254A" />
        <rect x="46" y="14" width="12" height="20" rx="4" fill="#C4B5FD" />
        <text x="19" y="46" fill="#F9A8D4" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">
          TAG B
        </text>
      </g>
    </svg>
  );
}
