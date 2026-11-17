import type { BaggageReportRecord } from '@/src/types/baggage';

export interface SimilarityResult {
  score: number;
  signals: string[];
}

const STOP_WORDS = new Set([
  'with',
  'from',
  'have',
  'this',
  'that',
  'they',
  'their',
  'there',
  'around',
  'inside',
  'outside',
  'side',
  'front',
  'back',
  'suitcase',
  'luggage',
  'baggage',
  'carry',
  'case',
  'trolley',
  'item',
  'near',
  'airport',
]);

const SYNONYM_GROUPS: Record<string, string> = {
  strap: 'strap',
  straps: 'strap',
  belt: 'strap',
  ribbon: 'strap',
  ribbons: 'strap',
  band: 'strap',
  cord: 'strap',
  tie: 'strap',
  sticker: 'marker',
  stickers: 'marker',
  decal: 'marker',
  decals: 'marker',
  patch: 'marker',
  patches: 'marker',
  badge: 'marker',
  label: 'marker',
  nametag: 'marker',
  lock: 'lock',
  padlock: 'lock',
  combo: 'lock',
  combination: 'lock',
  zipper: 'zipper',
  zippers: 'zipper',
  zip: 'zipper',
  scratch: 'wear',
  scratches: 'wear',
  scuff: 'wear',
  scuffs: 'wear',
  dent: 'wear',
  dents: 'wear',
  crack: 'wear',
  cracked: 'wear',
  worn: 'wear',
  wheel: 'wheel',
  wheels: 'wheel',
  spinner: 'wheel',
  handle: 'handle',
  handles: 'handle',
  pocket: 'pocket',
  pockets: 'pocket',
  pink: 'pink',
  rose: 'pink',
  blush: 'pink',
  magenta: 'pink',
  lavender: 'purple',
  purple: 'purple',
  violet: 'purple',
  lilac: 'purple',
  navy: 'blue',
  blue: 'blue',
  cobalt: 'blue',
  indigo: 'blue',
  silver: 'gray',
  gray: 'gray',
  grey: 'gray',
  charcoal: 'gray',
  red: 'red',
  crimson: 'red',
  burgundy: 'red',
  maroon: 'red',
  gold: 'gold',
  golden: 'gold',
  brass: 'gold',
  yellow: 'gold',
  flower: 'floral',
  floral: 'floral',
  flowers: 'floral',
  hard: 'hardshell',
  hardshell: 'hardshell',
  soft: 'softshell',
  softshell: 'softshell',
};

function normalizeText(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeTag(value?: string | null): string {
  return (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function stemToken(word: string): string {
  if (SYNONYM_GROUPS[word]) return SYNONYM_GROUPS[word];
  if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function tokenizeFeatures(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .map(stemToken);
}

function bigrams(str: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    result.add(str.slice(i, i + 2));
  }
  return result;
}

function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  const setA = bigrams(a);
  const setB = bigrams(b);
  let overlap = 0;
  for (const bg of setA) {
    if (setB.has(bg)) overlap++;
  }
  return (2 * overlap) / (setA.size + setB.size);
}

function normalizeColorFamily(color: string): string {
  const c = normalizeText(color);
  if (c.includes('pink') || c.includes('rose')) return 'pink';
  if (c.includes('lavender') || c.includes('purple')) return 'purple';
  if (c.includes('navy') || c.includes('blue')) return 'blue';
  if (c.includes('silver') || c.includes('gray') || c.includes('grey')) return 'gray';
  if (c.includes('red') || c.includes('burgundy')) return 'red';
  if (c.includes('green') || c.includes('olive')) return 'green';
  if (c.includes('beige') || c.includes('champagne')) return 'beige';
  return c;
}

function airportsMatch(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;

  const ignore = new Set(['airport', 'international', 'intl', 'terminal', 'city']);
  const tokensA = na.split(/\s+/).filter((t) => t.length >= 3 && !ignore.has(t));
  const tokensB = nb.split(/\s+/).filter((t) => t.length >= 3 && !ignore.has(t));
  return tokensA.some((ta) => tokensB.some((tb) => diceSimilarity(ta, tb) >= 0.8));
}

function areCompatibleTypes(a: BaggageReportRecord, b: BaggageReportRecord): boolean {
  if (a.id === b.id) return false;
  const pair = [a.report_type, b.report_type].sort().join(':');
  return (
    pair === 'found:lost' ||
    pair === 'exchanged:exchanged' ||
    pair === 'exchanged:found' ||
    pair === 'exchanged:lost'
  );
}

/**
 * Computes deterministic similarity score (0-100) using bag type, colour, brand,
 * distinctive features (with synonym & fuzzy matching), airport, and incident date.
 * Gives stronger importance to exact baggage tags and distinctive features.
 */
export function calculateBaggageSimilarity(
  a: BaggageReportRecord,
  b: BaggageReportRecord
): SimilarityResult | null {
  if (!areCompatibleTypes(a, b)) return null;

  let score = 0;
  const signals: string[] = [];

  // 1. Exact or partial baggage tag number (strongest identifier when present)
  const tagA = normalizeTag(a.tag_number);
  const tagB = normalizeTag(b.tag_number);
  if (tagA && tagB) {
    if (tagA === tagB) {
      score += 45;
      signals.push('Exact baggage tag number match');
    } else if (tagA.length >= 4 && tagB.length >= 4 && tagA.slice(-4) === tagB.slice(-4)) {
      score += 24;
      signals.push(`Matching final 4 tag digits (${tagA.slice(-4)})`);
    }
  }

  // 2. Distinctive features semantic + fuzzy token comparison (strong weight)
  const tokensA = Array.from(new Set(tokenizeFeatures(a.distinctive_features)));
  const tokensB = Array.from(new Set(tokenizeFeatures(b.distinctive_features)));
  const matchedFeatures: string[] = [];

  for (const ta of tokensA) {
    const hit = tokensB.find((tb) => ta === tb || diceSimilarity(ta, tb) >= 0.76);
    if (hit) {
      matchedFeatures.push(ta);
    }
  }

  if (matchedFeatures.length > 0) {
    const featureScore = Math.min(34, 12 + (matchedFeatures.length - 1) * 7);
    score += featureScore;
    signals.push(`Matching visual features (${matchedFeatures.slice(0, 4).join(', ')})`);
  }

  // 3. Airport similarity
  if (airportsMatch(a.airport, b.airport)) {
    score += 16;
    signals.push(`Matching airport (${a.airport})`);
  }

  // 4. Incident date proximity
  const timeDiffDays = Math.abs(
    (new Date(a.incident_date).getTime() - new Date(b.incident_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (!Number.isNaN(timeDiffDays)) {
    if (timeDiffDays <= 2) {
      score += 10;
      signals.push('Incident within 48 hours');
    } else if (timeDiffDays <= 7) {
      score += 5;
      signals.push('Incident within 7 days');
    }
  }

  // 5. Bag type, colour family, and brand
  if (normalizeText(a.bag_type) === normalizeText(b.bag_type)) {
    score += 10;
    signals.push('Same bag type');
  }

  if (
    normalizeColorFamily(a.color) &&
    normalizeColorFamily(a.color) === normalizeColorFamily(b.color)
  ) {
    score += 10;
    signals.push(`Matching bag colour (${a.color})`);
  }

  const brandA = normalizeText(a.brand);
  const brandB = normalizeText(b.brand);
  if (
    brandA &&
    brandB &&
    (brandA === brandB ||
      brandA.includes(brandB) ||
      brandB.includes(brandA) ||
      diceSimilarity(brandA, brandB) >= 0.8)
  ) {
    score += 8;
    signals.push(`Matching brand (${a.brand || b.brand})`);
  }

  return {
    score: Math.min(100, score),
    signals,
  };
}
