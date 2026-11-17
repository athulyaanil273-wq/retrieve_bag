/**
 * Retrieve Bag Design System Tokens & HCI Constants
 * Color budget: 60% Deep Navy Canvas · 30% Structural Surfaces · 10% Pink & Lavender Accents
 */

export interface ColorSwatchToken {
  name: string;
  hex: string;
  role: string;
  allocation: '60% Canvas' | '30% Surface' | '10% Accent' | 'Semantic';
  contrastNote: string;
}

export const COLOR_TOKENS: ColorSwatchToken[] = [
  {
    name: 'Midnight Navy',
    hex: '#0B132B',
    role: 'Primary application canvas',
    allocation: '60% Canvas',
    contrastNote: '15.8:1 contrast with Frost White ink',
  },
  {
    name: 'Deep Hangar Navy',
    hex: '#111C3A',
    role: 'Primary card and panel surface',
    allocation: '30% Surface',
    contrastNote: 'Single-elevation surface with hairline border',
  },
  {
    name: 'Boarding Gate Navy',
    hex: '#17254A',
    role: 'Elevated inputs, segmented tracks, hover states',
    allocation: '30% Surface',
    contrastNote: 'Subtle luminance delta over primary canvas',
  },
  {
    name: 'Suitcase Pink',
    hex: '#F472B6',
    role: 'Primary interactive CTAs and active focus rings',
    allocation: '10% Accent',
    contrastNote: 'Paired with #070D1F dark ink for 8.3:1 button contrast',
  },
  {
    name: 'Twilight Lavender',
    hex: '#C4B5FD',
    role: 'Secondary accents, step highlights, mascot details',
    allocation: '10% Accent',
    contrastNote: '9.7:1 contrast on Midnight Navy',
  },
  {
    name: 'Reunited Emerald',
    hex: '#34D399',
    role: 'Matched or reunited status (always with Check icon)',
    allocation: 'Semantic',
    contrastNote: 'Never used without explicit text label',
  },
  {
    name: 'Exchanged Amber',
    hex: '#FBBF24',
    role: 'Accidentally swapped / verification pending',
    allocation: 'Semantic',
    contrastNote: 'Always paired with swap/clock icon & text',
  },
  {
    name: 'Alert Rose',
    hex: '#FB7185',
    role: 'Lost report urgency & inline validation errors',
    allocation: 'Semantic',
    contrastNote: 'Always paired with alert icon & corrective guidance',
  },
];

export const HCI_STANDARDS = {
  /** Fitts's Law: Minimum interactive target height/width in pixels */
  minTouchTargetPx: 44,
  /** Hick's Law: Maximum primary choices per decision group */
  maxPrimaryChoices: 4,
  /** Motion budget: Routine hover/press feedback settles within 200ms */
  routineTransitionMs: 180,
  /** Settling cubic-bezier easing curve */
  easeSettle: [0.16, 1, 0.3, 1] as const,
  /** Nested corner radius formula: r_inner = r_outer - padding */
  radii: {
    cardOuterPx: 20,
    cardInnerPx: 12,
    controlPx: 12,
  },
} as const;
