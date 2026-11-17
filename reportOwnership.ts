const OWNED_REPORTS_KEY = 'retrieve_bag_owned_report_ids';
const GUEST_SESSION_KEY = 'retrieve_bag_guest_session_id';

let fallbackMemoryToken: string | null = null;

function generateSecureToken(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    if (typeof crypto.randomUUID === 'function') {
      return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    }
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * Generates or returns the persistent anonymous guest claim token
 * associated with reports created on this device when the traveler is not signed in.
 */
export function getGuestClaimToken(): string {
  if (typeof window === 'undefined') {
    if (!fallbackMemoryToken) fallbackMemoryToken = generateSecureToken();
    return fallbackMemoryToken;
  }

  try {
    const existing = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (existing && existing.length >= 16) return existing;
    const generated = generateSecureToken();
    window.localStorage.setItem(GUEST_SESSION_KEY, generated);
    return generated;
  } catch {
    if (!fallbackMemoryToken) fallbackMemoryToken = generateSecureToken();
    return fallbackMemoryToken;
  }
}

export function getGuestSessionId(): string {
  return getGuestClaimToken();
}

export function toNumericReportIds(reportIds: string[]): number[] {
  return reportIds
    .filter((id) => /^\d+$/.test(id))
    .map((id) => Number(id));
}

/**
 * Tracks only the UUIDs of reports submitted from this browser session/device
 * so guest travelers without an account automatically see their own
 * reports, matches, and Supabase notifications across page refreshes and revisits.
 */
export function getOwnedReportIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OWNED_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function addOwnedReportId(reportId: string): void {
  if (typeof window === 'undefined' || !reportId) return;
  try {
    getGuestSessionId();
    const existing = getOwnedReportIds();
    if (!existing.includes(reportId)) {
      window.localStorage.setItem(OWNED_REPORTS_KEY, JSON.stringify([reportId, ...existing]));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function removeOwnedReportId(reportId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const filtered = getOwnedReportIds().filter((id) => id !== reportId);
    window.localStorage.setItem(OWNED_REPORTS_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Removes any locally stored report IDs that were deleted from Supabase
 * while preserving order and valid IDs.
 */
export function pruneMissingOwnedReportIds(existingIdsInDb: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getOwnedReportIds();
    const pruned = current.filter((id) => existingIdsInDb.has(id));
    if (pruned.length !== current.length) {
      window.localStorage.setItem(OWNED_REPORTS_KEY, JSON.stringify(pruned));
    }
  } catch {
    // Ignore storage errors
  }
}
