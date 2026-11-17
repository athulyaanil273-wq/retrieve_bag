import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl, supabase } from '@/src/lib/supabase';
import { calculateBaggageSimilarity } from '@/src/lib/matching';
import {
  addOwnedReportId,
  getGuestClaimToken,
  getOwnedReportIds,
  pruneMissingOwnedReportIds,
  removeOwnedReportId,
  toNumericReportIds,
} from '@/src/lib/reportOwnership';
import { emitBaggageDataUpdated } from '@/src/lib/realtimeSync';
import { formatBaggageTag } from '@/src/lib/utils';
import type {
  BaggageMatchRecord,
  BaggageMatchWithReports,
  BaggageNotificationRecord,
  BaggageNotificationWithReports,
  BaggageReportRecord,
  ConnectionRequestDetailed,
  ConnectionRequestRecord,
  CreateBaggageReportInput,
  MatchStatus,
  ReportStatus,
  ReportType,
} from '@/src/types/baggage';

export const STRONG_MATCH_THRESHOLD = 45;

export const REPORT_SUBMISSION_CONFIRMATIONS: Record<ReportType, string> = {
  lost: 'Lost bag report submitted successfully! Please look out for notifications.',
  found: 'Found bag report submitted successfully.',
  exchanged: 'Exchanged bag report submitted successfully.',
};

export const LOST_AND_FOUND_COLLECTION_MESSAGE =
  'Good news! A bag matching your description has been found. Please visit the airport baggage service/front desk to verify ownership and collect your baggage. Carry your baggage tag or other proof of ownership.';

export const STAFF_VERIFICATION_NOTICE =
  'Similarity scores highlight potential matches only. Airport baggage service staff must verify your baggage tag or other proof of ownership before releasing any luggage.';

let activeClient: SupabaseClient | null = supabase;

/**
 * Allows automated integration tests to bind a test Supabase client instance.
 * Production always uses the configured client from src/lib/supabase.ts.
 */
export function setSupabaseClientForTesting(client: SupabaseClient | null): void {
  activeClient = client;
  cachedColumns = null;
}

function requireSupabase(): SupabaseClient {
  if (!activeClient) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }
  return activeClient;
}

export interface DashboardCounts {
  submittedReports: number;
  automaticMatches: number;
  pending: number;
  pendingReports: number;
  pendingRequests: number;
}

export function computeDashboardCounts(
  reports: BaggageReportRecord[],
  matches: BaggageMatchWithReports[],
  connections: ConnectionRequestDetailed[]
): DashboardCounts {
  const validMatches = matches.filter((m) => m.status !== 'dismissed');
  const pendingReports = reports.filter(
    (r) => r.status !== 'reunited' && r.status !== 'closed'
  ).length;
  const pendingRequests = connections.filter((c) => c.status === 'pending').length;

  return {
    submittedReports: reports.length,
    automaticMatches: validMatches.length,
    pending: pendingReports + pendingRequests,
    pendingReports,
    pendingRequests,
  };
}

interface SupabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

export function formatSupabaseError(
  error: SupabaseErrorLike | null | undefined,
  fallback: string
): string {
  if (!error) return fallback;

  const code = error.code ? String(error.code) : '';
  const message = error.message ? String(error.message) : fallback;
  const details = error.details ? String(error.details) : '';
  const hint = error.hint ? String(error.hint) : '';

  const parts: string[] = [code ? `[${code}] ${message}` : message];
  if (details) parts.push(`Details: ${details}`);
  if (hint) parts.push(`Hint: ${hint}`);

  const lower = message.toLowerCase();
  if (code === '42501' && lower.includes('baggage_reports')) {
    parts.push(
      'Action needed: Guest (anon) submissions or sequence access on public.baggage_reports are blocked by Supabase Row Level Security. Run supabase/baggage_reports_rls.sql in your Supabase SQL Editor.'
    );
  } else if (code === 'PGRST125' || lower.includes('invalid path specified')) {
    parts.push(
      'Action needed: Verify VITE_SUPABASE_URL is the base project URL (https://<project-ref>.supabase.co) without /rest/v1.'
    );
  }

  return parts.join(' | ');
}

function isMissingRpcError(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
}

interface BaggageColumnMap {
  reportType: string;
  airport: string;
  incidentDate: string;
  bagType: string;
  color: string;
  brand: string;
  tagNumber: string;
  distinctiveFeatures: string;
  hasReferenceCode: boolean;
  hasStatus: boolean;
  hasUserId: boolean;
}

const DEFAULT_COLUMNS: BaggageColumnMap = {
  reportType: 'report_type',
  airport: 'airport',
  incidentDate: 'incident_date',
  bagType: 'bag_type',
  color: 'color',
  brand: 'brand',
  tagNumber: 'tag_number',
  distinctiveFeatures: 'distinctive_features',
  hasReferenceCode: false,
  hasStatus: true,
  hasUserId: true,
};

let cachedColumns: BaggageColumnMap | null = null;

function pickColumn(keys: Set<string>, candidates: string[], fallback: string): string {
  for (const candidate of candidates) {
    if (keys.has(candidate)) return candidate;
  }
  return fallback;
}

function buildColumnMapFromKeys(keys: Set<string>): BaggageColumnMap {
  return {
    reportType: pickColumn(keys, ['report_type', 'type'], 'report_type'),
    airport: pickColumn(keys, ['airport', 'airport_name', 'airport_code'], 'airport'),
    incidentDate: pickColumn(keys, ['incident_date', 'date'], 'incident_date'),
    bagType: pickColumn(keys, ['bag_type', 'baggage_type'], 'bag_type'),
    color: pickColumn(keys, ['bag_colour', 'bag_color', 'colour', 'color'], 'color'),
    brand: pickColumn(keys, ['brand', 'bag_brand'], 'brand'),
    tagNumber: pickColumn(
      keys,
      ['bag_tag_number', 'baggage_tag_number', 'tag_number', 'tag'],
      'tag_number'
    ),
    distinctiveFeatures: pickColumn(
      keys,
      ['distinctive_features', 'features', 'description'],
      'distinctive_features'
    ),
    hasReferenceCode: keys.has('reference_code'),
    hasStatus: keys.has('status'),
    hasUserId: keys.has('user_id'),
  };
}

const PROBE_CANDIDATE_COLUMNS = [
  'id',
  'created_at',
  'user_id',
  'status',
  'reference_code',
  'report_type',
  'type',
  'airport',
  'airport_code',
  'airport_name',
  'incident_date',
  'date',
  'bag_type',
  'baggage_type',
  'bag_colour',
  'bag_color',
  'colour',
  'color',
  'brand',
  'bag_brand',
  'bag_tag_number',
  'baggage_tag_number',
  'tag_number',
  'tag',
  'distinctive_features',
  'features',
  'description',
];

async function probeBaggageColumnsViaSelect(client: SupabaseClient): Promise<Set<string>> {
  const present = new Set<string>();
  const checks = await Promise.all(
    PROBE_CANDIDATE_COLUMNS.map(async (col) => {
      try {
        const { error } = await client.from('baggage_reports').select(col).limit(0);
        return error ? null : col;
      } catch {
        return null;
      }
    })
  );

  for (const col of checks) {
    if (col) present.add(col);
  }
  return present;
}

/**
 * Inspects the live PostgREST OpenAPI specification, sample row, or column probe
 * for `baggage_reports` so the 8 form fields map cleanly to existing Supabase columns
 * without modifying the database schema.
 */
async function resolveBaggageColumns(): Promise<BaggageColumnMap> {
  if (cachedColumns) return cachedColumns;

  const client = activeClient;
  const clientAny = client as unknown as { supabaseUrl?: string; supabaseKey?: string } | null;
  const url = normalizeSupabaseUrl(
    clientAny?.supabaseUrl || (import.meta.env?.VITE_SUPABASE_URL as string | undefined)
  );
  const anonKey =
    (
      clientAny?.supabaseKey || (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined)
    )?.trim() || undefined;

  if (url && anonKey) {
    try {
      const headers: Record<string, string> = {
        apikey: anonKey,
        Accept: 'application/openapi+json',
      };
      if (anonKey.startsWith('eyJ')) {
        headers.Authorization = `Bearer ${anonKey}`;
      }

      const response = await fetch(`${url}/rest/v1/`, { headers });

      if (response.ok) {
        const spec = (await response.json()) as {
          definitions?: {
            baggage_reports?: { properties?: Record<string, unknown> };
          };
          components?: {
            schemas?: {
              baggage_reports?: { properties?: Record<string, unknown> };
            };
          };
        };

        const props =
          spec.definitions?.baggage_reports?.properties ??
          spec.components?.schemas?.baggage_reports?.properties;

        if (props) {
          cachedColumns = buildColumnMapFromKeys(new Set(Object.keys(props)));
          return cachedColumns;
        }
      }
    } catch {
      // Fall back to sample row / column probe below
    }
  }

  if (client) {
    try {
      const { data, error } = await client.from('baggage_reports').select('*').limit(1);
      if (!error && Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object') {
        cachedColumns = buildColumnMapFromKeys(
          new Set(Object.keys(data[0] as Record<string, unknown>))
        );
        return cachedColumns;
      }

      const probed = await probeBaggageColumnsViaSelect(client);
      if (probed.size > 0) {
        cachedColumns = buildColumnMapFromKeys(probed);
        return cachedColumns;
      }
    } catch {
      // Fall back to defaults
    }
  }

  return DEFAULT_COLUMNS;
}

function normalizeReportRow(raw: Record<string, unknown>): BaggageReportRecord {
  const id = String(raw.id ?? '');
  const ref =
    typeof raw.reference_code === 'string' && raw.reference_code
      ? raw.reference_code
      : `RB-${id.slice(0, 8).toUpperCase()}`;

  return {
    id,
    reference_code: ref,
    user_id: typeof raw.user_id === 'string' ? raw.user_id : null,
    report_type: (raw.report_type ?? raw.type ?? 'lost') as ReportType,
    status: (raw.status ?? 'open') as ReportStatus,
    airport: String(raw.airport ?? raw.airport_name ?? raw.airport_code ?? ''),
    incident_date: String(raw.incident_date ?? raw.date ?? ''),
    bag_type: String(raw.bag_type ?? raw.baggage_type ?? 'other'),
    color: String(raw.bag_colour ?? raw.bag_color ?? raw.colour ?? raw.color ?? ''),
    brand: (raw.brand ?? raw.bag_brand ?? null) as string | null,
    tag_number: (raw.bag_tag_number ?? raw.baggage_tag_number ?? raw.tag_number ?? raw.tag ?? null) as
      | string
      | null,
    distinctive_features: String(
      raw.distinctive_features ?? raw.features ?? raw.description ?? ''
    ),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function normalizeMatchRow(raw: Record<string, unknown>): BaggageMatchRecord {
  return {
    id: String(raw.id ?? ''),
    report_a_id: String(raw.report_a_id ?? ''),
    report_b_id: String(raw.report_b_id ?? ''),
    similarity_score: Number(raw.similarity_score ?? 0),
    matching_signals: Array.isArray(raw.matching_signals)
      ? raw.matching_signals.map(String)
      : [],
    status: (raw.status ?? 'suggested') as MatchStatus,
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function normalizeNotificationRow(raw: Record<string, unknown>): BaggageNotificationRecord {
  return {
    id: String(raw.id ?? ''),
    report_id: String(raw.report_id ?? ''),
    matched_report_id: String(raw.matched_report_id ?? ''),
    match_id:
      raw.match_id !== null && raw.match_id !== undefined ? String(raw.match_id) : null,
    recipient_user_id:
      typeof raw.recipient_user_id === 'string' ? raw.recipient_user_id : null,
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    similarity_score: Number(raw.similarity_score ?? 0),
    is_read: Boolean(raw.is_read),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function normalizeConnectionRow(raw: Record<string, unknown>): ConnectionRequestRecord {
  return {
    id: String(raw.id ?? ''),
    match_id: String(raw.match_id ?? ''),
    requester_id: typeof raw.requester_id === 'string' ? raw.requester_id : null,
    recipient_id: typeof raw.recipient_id === 'string' ? raw.recipient_id : null,
    requester_report_id: String(raw.requester_report_id ?? ''),
    recipient_report_id: String(raw.recipient_report_id ?? ''),
    requester_email:
      typeof raw.requester_email === 'string' ? raw.requester_email : null,
    message: String(raw.message ?? ''),
    status: (raw.status ?? 'pending') as ConnectionRequestRecord['status'],
    shared_contact: typeof raw.shared_contact === 'string' ? raw.shared_contact : null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

function orderReportPairIds(a: string, b: string): [string, string] {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    return Number(a) < Number(b) ? [a, b] : [b, a];
  }
  return a < b ? [a, b] : [b, a];
}

function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `RB-${year}-${suffix}${rand}`;
}

export function buildNotificationContent(
  targetReport: BaggageReportRecord,
  matchedReport: BaggageReportRecord,
  similarityScore: number
): { title: string; message: string } {
  const pair = [targetReport.report_type, matchedReport.report_type].sort().join(':');

  if (pair === 'found:lost') {
    if (targetReport.report_type === 'lost') {
      return {
        title: 'Potential matching bag found',
        message: LOST_AND_FOUND_COLLECTION_MESSAGE,
      };
    }

    return {
      title: 'Potential matching lost report detected',
      message: `A lost baggage report closely matches the bag you reported (${similarityScore}% similarity). Please ensure the suitcase is turned in to the airport baggage service/front desk so staff can verify ownership before release.`,
    };
  }

  return {
    title: 'Potential exchanged baggage match detected',
    message: `A potentially matching baggage report was detected (${similarityScore}% similarity). Please visit the airport baggage service/front desk with your baggage tag or other proof of ownership so staff can verify ownership before any baggage exchange.`,
  };
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.toLowerCase().includes('could not find the table')) ||
    Boolean(error.message?.toLowerCase().includes('does not exist'))
  );
}

/**
 * Finds or inserts a deduplicated match row in `baggage_matches` without relying
 * exclusively on `ON CONFLICT` constraints.
 */
async function ensureMatchRecord(
  client: SupabaseClient,
  firstReportId: string,
  secondReportId: string,
  similarityScore: number,
  matchingSignals: string[]
): Promise<BaggageMatchRecord | null> {
  const { data: existing } = await client
    .from('baggage_matches')
    .select('*')
    .eq('report_a_id', firstReportId)
    .eq('report_b_id', secondReportId)
    .maybeSingle();

  if (existing) {
    return normalizeMatchRow(existing as Record<string, unknown>);
  }

  const { data: inserted, error: insertErr } = await client
    .from('baggage_matches')
    .insert({
      report_a_id: firstReportId,
      report_b_id: secondReportId,
      similarity_score: similarityScore,
      matching_signals: matchingSignals,
      status: 'suggested',
    })
    .select('*')
    .maybeSingle();

  if (!insertErr && inserted) {
    return normalizeMatchRow(inserted as Record<string, unknown>);
  }

  // Handle race condition unique violation gracefully by fetching existing row
  if (insertErr?.code === '23505') {
    const { data: retried } = await client
      .from('baggage_matches')
      .select('*')
      .eq('report_a_id', firstReportId)
      .eq('report_b_id', secondReportId)
      .maybeSingle();
    return retried ? normalizeMatchRow(retried as Record<string, unknown>) : null;
  }

  return null;
}

/**
 * Inserts a deduplicated persistent notification into `notifications`.
 */
async function ensureNotificationRecord(
  client: SupabaseClient,
  params: {
    reportId: string;
    matchedReportId: string;
    matchId: string | null;
    recipientUserId: string | null;
    title: string;
    message: string;
    similarityScore: number;
  }
): Promise<boolean> {
  try {
    const { data: existing, error: selectErr } = await client
      .from('notifications')
      .select('id')
      .eq('report_id', params.reportId)
      .eq('matched_report_id', params.matchedReportId)
      .maybeSingle();

    if (selectErr && isMissingTableError(selectErr)) {
      return false;
    }
    if (existing) {
      return false;
    }

    const { error: insertErr } = await client.from('notifications').insert({
      report_id: params.reportId,
      matched_report_id: params.matchedReportId,
      match_id: params.matchId,
      recipient_user_id: params.recipientUserId,
      title: params.title,
      message: params.message,
      similarity_score: params.similarityScore,
      is_read: false,
    });

    return !insertErr;
  } catch {
    return false;
  }
}

export async function discoverMatchesForReport(
  sourceReport: BaggageReportRecord
): Promise<{ matches: BaggageMatchRecord[]; notificationsCreated: number }> {
  const client = requireSupabase();
  const cols = await resolveBaggageColumns();

  try {
    const { data: candidates, error } = await client
      .from('baggage_reports')
      .select('*')
      .neq('id', sourceReport.id)
      .limit(200);

    if (error || !candidates) {
      return { matches: [], notificationsCreated: 0 };
    }

    const createdMatches: BaggageMatchRecord[] = [];
    let notificationsCreated = 0;

    for (const rawCandidate of candidates as Record<string, unknown>[]) {
      const candidate = normalizeReportRow(rawCandidate);
      if (candidate.status === 'reunited' || candidate.status === 'closed') continue;

      const similarity = calculateBaggageSimilarity(sourceReport, candidate);
      if (!similarity || similarity.score < STRONG_MATCH_THRESHOLD) continue;

      const [first, second] = orderReportPairIds(sourceReport.id, candidate.id);

      const matchRow = await ensureMatchRecord(
        client,
        first,
        second,
        similarity.score,
        similarity.signals
      );

      if (matchRow) {
        createdMatches.push(matchRow);
      }

      if (cols.hasStatus) {
        try {
          await client
            .from('baggage_reports')
            .update({ status: 'potential_match' })
            .in('id', [sourceReport.id, candidate.id])
            .eq('status', 'open');
        } catch {
          // Best-effort status sync
        }
      }

      const targets: Array<{ target: BaggageReportRecord; counterpart: BaggageReportRecord }> = [
        { target: sourceReport, counterpart: candidate },
        { target: candidate, counterpart: sourceReport },
      ];

      for (const { target, counterpart } of targets) {
        const content = buildNotificationContent(target, counterpart, similarity.score);
        const created = await ensureNotificationRecord(client, {
          reportId: target.id,
          matchedReportId: counterpart.id,
          matchId: matchRow?.id ?? null,
          recipientUserId: target.user_id ?? null,
          title: content.title,
          message: content.message,
          similarityScore: similarity.score,
        });
        if (created) {
          notificationsCreated += 1;
        }
      }
    }

    return { matches: createdMatches, notificationsCreated };
  } catch {
    return { matches: [], notificationsCreated: 0 };
  }
}

function buildInsertPayload(
  input: CreateBaggageReportInput,
  cols: BaggageColumnMap,
  userId: string | null
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    [cols.reportType]: input.report_type,
    [cols.airport]: input.airport.trim(),
    [cols.incidentDate]: input.incident_date,
    [cols.bagType]: input.bag_type,
    [cols.color]: input.color.trim(),
    [cols.brand]: input.brand?.trim() || null,
    [cols.tagNumber]: input.tag_number ? formatBaggageTag(input.tag_number) : null,
    [cols.distinctiveFeatures]: input.distinctive_features.trim(),
  };

  if (cols.hasReferenceCode) {
    payload.reference_code = generateReferenceCode();
  }
  if (cols.hasStatus) {
    payload.status = 'open';
  }
  if (cols.hasUserId && userId) {
    payload.user_id = userId;
  }

  return payload;
}

function isSchemaMismatchError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (error.code === '23502' &&
      (msg.includes('reference_code') || msg.includes('brand') || msg.includes('tag'))) ||
    msg.includes('could not find the')
  );
}

export async function createBaggageReport(
  input: CreateBaggageReportInput,
  userId: string | null = null
): Promise<{
  report: BaggageReportRecord;
  matchesFound: number;
  notificationsCreated: number;
}> {
  const client = requireSupabase();
  const formattedTag = input.tag_number ? formatBaggageTag(input.tag_number) : null;
  const guestToken = userId ? null : getGuestClaimToken();

  // Preferred path: secure server-side RPC handles validated INSERT, hashed guest
  // claim token registration, and server-side matching/notifications without exposing
  // other travelers' baggage tag numbers or requiring unrestricted anon SELECT.
  const rpcRes = await client.rpc('submit_baggage_report', {
    p_report_type: input.report_type,
    p_airport: input.airport.trim(),
    p_incident_date: input.incident_date,
    p_bag_type: input.bag_type,
    p_bag_colour: input.color.trim(),
    p_brand: input.brand?.trim() || null,
    p_bag_tag_number: formattedTag,
    p_distinctive_features: input.distinctive_features.trim(),
    p_guest_token: guestToken,
  });

  if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object') {
    const payload = rpcRes.data as {
      report?: Record<string, unknown>;
      matches_found?: number;
      notifications_created?: number;
    };
    if (payload.report) {
      const createdReport = normalizeReportRow(payload.report);
      addOwnedReportId(createdReport.id);
      emitBaggageDataUpdated();
      return {
        report: createdReport,
        matchesFound: Number(payload.matches_found ?? 0),
        notificationsCreated: Number(payload.notifications_created ?? 0),
      };
    }
  }

  if (rpcRes.error && !isMissingRpcError(rpcRes.error)) {
    const formatted = formatSupabaseError(rpcRes.error, 'Unable to submit baggage report.');
    throw new Error(formatted);
  }

  // Fallback for pre-RPC environments or direct-INSERT RLS setups
  let cols = await resolveBaggageColumns();
  let payload = buildInsertPayload(input, cols, userId);

  let { data, error } = await client
    .from('baggage_reports')
    .insert(payload)
    .select('*')
    .single();

  // If schema resolution fell back to defaults on an empty/introspection-locked project,
  // adapt cleanly based on the exact schema error without altering the DB schema.
  if (error && isSchemaMismatchError(error)) {
    const msg = (error.message ?? '').toLowerCase();
    const adapted: BaggageColumnMap = { ...cols };
    let forceEmptyStringsForOptional = false;

    if (msg.includes('reference_code')) {
      adapted.hasReferenceCode = !msg.includes('does not exist') && !msg.includes('could not find');
    }
    if (msg.includes('airport_code') || msg.includes("'airport'")) {
      adapted.airport = adapted.airport === 'airport' ? 'airport_code' : 'airport';
    }
    if (msg.includes('bag_colour') || msg.includes("'color'")) {
      adapted.color = adapted.color === 'color' ? 'bag_colour' : 'color';
    }
    if (
      msg.includes('bag_tag_number') ||
      msg.includes('baggage_tag_number') ||
      msg.includes("'tag_number'")
    ) {
      adapted.tagNumber =
        adapted.tagNumber === 'tag_number'
          ? 'bag_tag_number'
          : adapted.tagNumber === 'bag_tag_number'
          ? 'baggage_tag_number'
          : 'tag_number';
    }
    if (msg.includes('status') && (msg.includes('does not exist') || msg.includes('could not find'))) {
      adapted.hasStatus = false;
    }
    if (error.code === '23502' && (msg.includes('brand') || msg.includes('tag'))) {
      forceEmptyStringsForOptional = true;
    }

    const didChange =
      forceEmptyStringsForOptional ||
      adapted.hasReferenceCode !== cols.hasReferenceCode ||
      adapted.airport !== cols.airport ||
      adapted.color !== cols.color ||
      adapted.tagNumber !== cols.tagNumber ||
      adapted.hasStatus !== cols.hasStatus;

    if (didChange) {
      cols = adapted;
      cachedColumns = adapted;
      payload = buildInsertPayload(input, cols, userId);
      if (forceEmptyStringsForOptional) {
        if (payload[cols.brand] === null) payload[cols.brand] = '';
        if (payload[cols.tagNumber] === null) payload[cols.tagNumber] = '';
      }

      const retry = await client
        .from('baggage_reports')
        .insert(payload)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data) {
    const formatted = formatSupabaseError(error, 'Unable to submit baggage report.');
    throw new Error(formatted);
  }

  const createdReport = normalizeReportRow(data as Record<string, unknown>);

  // Register only this browser's submitted report ID so the traveler automatically
  // receives their reports, matches, and notifications without sign-in.
  addOwnedReportId(createdReport.id);

  const discovery = await discoverMatchesForReport(createdReport);
  emitBaggageDataUpdated();

  return {
    report: createdReport,
    matchesFound: discovery.matches.length,
    notificationsCreated: discovery.notificationsCreated,
  };
}

export async function fetchUserReports(userId: string): Promise<BaggageReportRecord[]> {
  const client = requireSupabase();
  const cols = await resolveBaggageColumns();
  if (!cols.hasUserId) {
    return [];
  }

  const { data, error } = await client
    .from('baggage_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeReportRow);
}

export async function fetchReportsByIds(reportIds: string[]): Promise<BaggageReportRecord[]> {
  if (reportIds.length === 0) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('baggage_reports')
    .select('*')
    .in('id', reportIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeReportRow);
}

export async function fetchOwnedAndUserReports(
  userId: string | null,
  ownedReportIds: string[]
): Promise<BaggageReportRecord[]> {
  const client = requireSupabase();
  const numericIds = toNumericReportIds(ownedReportIds);
  const rpcRes = await client.rpc('get_my_baggage_reports', {
    p_report_ids: numericIds,
    p_guest_token: userId ? null : getGuestClaimToken(),
  });

  if (!rpcRes.error && Array.isArray(rpcRes.data)) {
    const rpcReports = (rpcRes.data as Record<string, unknown>[]).map(normalizeReportRow);
    if (ownedReportIds.length > 0 && rpcReports.length > 0) {
      // Prune only reports missing when server verified the token
      const presentSet = new Set(rpcReports.map((r) => r.id));
      const existingOwned = ownedReportIds.filter((id) => presentSet.has(id) || !/^\d+$/.test(id));
      if (existingOwned.length > 0) {
        pruneMissingOwnedReportIds(new Set([...existingOwned, ...presentSet]));
      }
    }
    return rpcReports;
  }

  if (rpcRes.error && !isMissingRpcError(rpcRes.error)) {
    throw new Error(formatSupabaseError(rpcRes.error, 'Unable to load your reports.'));
  }

  const [userReports, deviceReports] = await Promise.all([
    userId ? fetchUserReports(userId) : Promise.resolve([]),
    ownedReportIds.length > 0 ? fetchReportsByIds(ownedReportIds) : Promise.resolve([]),
  ]);

  if (ownedReportIds.length > 0) {
    pruneMissingOwnedReportIds(new Set(deviceReports.map((r) => r.id)));
  }

  // Ensure a different logged-in account on a shared browser cannot read another account's reports
  const authorizedDeviceReports = deviceReports.filter(
    (r) => r.user_id === null || (userId !== null && r.user_id === userId)
  );

  const merged = new Map<string, BaggageReportRecord>();
  for (const r of [...userReports, ...authorizedDeviceReports]) {
    merged.set(r.id, r);
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function fetchAllReports(): Promise<BaggageReportRecord[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('baggage_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeReportRow);
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<BaggageReportRecord> {
  const client = requireSupabase();
  if (/^\d+$/.test(reportId)) {
    const rpcRes = await client.rpc('update_my_report_status', {
      p_report_id: Number(reportId),
      p_status: status,
      p_report_ids: toNumericReportIds(getOwnedReportIds()),
      p_guest_token: getGuestClaimToken(),
    });
    if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object') {
      emitBaggageDataUpdated();
      return normalizeReportRow(rpcRes.data as Record<string, unknown>);
    }
    if (rpcRes.error && !isMissingRpcError(rpcRes.error)) {
      throw new Error(formatSupabaseError(rpcRes.error, 'Failed to update report status.'));
    }
  }

  const { data, error } = await client
    .from('baggage_reports')
    .update({ status })
    .eq('id', reportId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update report status.');
  emitBaggageDataUpdated();
  return normalizeReportRow(data as Record<string, unknown>);
}

export async function deleteBaggageReport(reportId: string): Promise<void> {
  const client = requireSupabase();
  if (/^\d+$/.test(reportId)) {
    const rpcRes = await client.rpc('delete_my_report', {
      p_report_id: Number(reportId),
      p_report_ids: toNumericReportIds(getOwnedReportIds()),
      p_guest_token: getGuestClaimToken(),
    });
    if (!rpcRes.error) {
      removeOwnedReportId(reportId);
      emitBaggageDataUpdated();
      return;
    }
    if (!isMissingRpcError(rpcRes.error)) {
      throw new Error(formatSupabaseError(rpcRes.error, 'Unable to delete report.'));
    }
  }

  const { error } = await client.from('baggage_reports').delete().eq('id', reportId);
  if (error) throw new Error(error.message);
  removeOwnedReportId(reportId);
  emitBaggageDataUpdated();
}

async function hydrateMatches(matches: BaggageMatchRecord[]): Promise<BaggageMatchWithReports[]> {
  if (matches.length === 0) return [];
  const client = requireSupabase();

  const reportIds = Array.from(
    new Set(matches.flatMap((m) => [m.report_a_id, m.report_b_id]))
  );

  const { data: reports, error } = await client
    .from('baggage_reports')
    .select('*')
    .in('id', reportIds);

  if (error) throw new Error(error.message);

  const reportMap = new Map<string, BaggageReportRecord>(
    ((reports ?? []) as Record<string, unknown>[])
      .map(normalizeReportRow)
      .map((r) => [r.id, r])
  );

  return matches
    .map((m) => {
      const report_a = reportMap.get(m.report_a_id);
      const report_b = reportMap.get(m.report_b_id);
      if (!report_a || !report_b) return null;
      return { ...m, report_a, report_b };
    })
    .filter((item): item is BaggageMatchWithReports => item !== null);
}

export async function fetchMatchesForReportIds(
  reportIds: string[]
): Promise<BaggageMatchWithReports[]> {
  const client = requireSupabase();
  const numericIds = toNumericReportIds(reportIds);

  try {
    const rpcRes = await client.rpc('get_my_baggage_matches', {
      p_report_ids: numericIds,
      p_guest_token: getGuestClaimToken(),
    });
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return (rpcRes.data as Record<string, unknown>[])
        .map((row) => {
          if (!row.report_a || !row.report_b) return null;
          return {
            ...normalizeMatchRow(row),
            report_a: normalizeReportRow(row.report_a as Record<string, unknown>),
            report_b: normalizeReportRow(row.report_b as Record<string, unknown>),
          };
        })
        .filter((item): item is BaggageMatchWithReports => item !== null);
    }
    if (rpcRes.error && !isMissingRpcError(rpcRes.error)) {
      return [];
    }
  } catch {
    // Fall through to legacy table query if RPC unavailable
  }

  if (reportIds.length === 0) return [];
  const idList = reportIds.join(',');

  try {
    const { data, error } = await client
      .from('baggage_matches')
      .select('*')
      .or(`report_a_id.in.(${idList}),report_b_id.in.(${idList})`)
      .order('similarity_score', { ascending: false });

    if (error) return [];
    return hydrateMatches(
      ((data ?? []) as Record<string, unknown>[]).map(normalizeMatchRow)
    );
  } catch {
    return [];
  }
}

export async function fetchMatchById(matchId: string): Promise<BaggageMatchWithReports | null> {
  const client = requireSupabase();
  const rpcRes = await client.rpc('get_my_match_by_id', {
    p_match_id: matchId,
    p_report_ids: toNumericReportIds(getOwnedReportIds()),
    p_guest_token: getGuestClaimToken(),
  });

  if (!rpcRes.error) {
    if (!rpcRes.data || typeof rpcRes.data !== 'object') return null;
    const row = rpcRes.data as Record<string, unknown>;
    if (!row.report_a || !row.report_b) return null;
    return {
      ...normalizeMatchRow(row),
      report_a: normalizeReportRow(row.report_a as Record<string, unknown>),
      report_b: normalizeReportRow(row.report_b as Record<string, unknown>),
    };
  }

  if (!isMissingRpcError(rpcRes.error)) {
    throw new Error(formatSupabaseError(rpcRes.error, 'Unable to load match details.'));
  }

  const { data, error } = await client
    .from('baggage_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const hydrated = await hydrateMatches([
    normalizeMatchRow(data as Record<string, unknown>),
  ]);
  return hydrated[0] ?? null;
}

export async function fetchAllMatches(): Promise<BaggageMatchWithReports[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('baggage_matches')
    .select('*')
    .order('similarity_score', { ascending: false });

  if (error) throw new Error(error.message);
  return hydrateMatches(
    ((data ?? []) as Record<string, unknown>[]).map(normalizeMatchRow)
  );
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<BaggageMatchRecord> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('baggage_matches')
    .update({ status })
    .eq('id', matchId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update match status.');
  emitBaggageDataUpdated();
  return normalizeMatchRow(data as Record<string, unknown>);
}

export async function runSystemMatchScan(): Promise<number> {
  const reports = await fetchAllReports();
  const activeReports = reports.filter(
    (r) => r.status !== 'reunited' && r.status !== 'closed'
  );

  let createdCount = 0;
  for (const report of activeReports) {
    const discovery = await discoverMatchesForReport(report);
    createdCount += discovery.matches.length;
  }
  emitBaggageDataUpdated();
  return createdCount;
}

export async function fetchNotificationsForOwner(
  reportIds: string[],
  userId: string | null
): Promise<{ notifications: BaggageNotificationWithReports[]; tableMissing: boolean }> {
  if (reportIds.length === 0 && !userId) {
    return { notifications: [], tableMissing: false };
  }

  const client = requireSupabase();
  const rpcRes = await client.rpc('get_my_notifications', {
    p_report_ids: toNumericReportIds(reportIds),
    p_guest_token: userId ? null : getGuestClaimToken(),
  });

  if (!rpcRes.error && Array.isArray(rpcRes.data)) {
    const hydrated: BaggageNotificationWithReports[] = (
      rpcRes.data as Record<string, unknown>[]
    ).map((row) => ({
      ...normalizeNotificationRow(row),
      report: row.report ? normalizeReportRow(row.report as Record<string, unknown>) : undefined,
      matched_report: row.matched_report
        ? normalizeReportRow(row.matched_report as Record<string, unknown>)
        : undefined,
    }));
    return { notifications: hydrated, tableMissing: false };
  }

  if (rpcRes.error && !isMissingRpcError(rpcRes.error)) {
    if (isMissingTableError(rpcRes.error)) {
      return { notifications: [], tableMissing: true };
    }
    throw new Error(formatSupabaseError(rpcRes.error, 'Unable to load notifications.'));
  }

  const filters: string[] = [];
  if (reportIds.length > 0) {
    filters.push(`report_id.in.(${reportIds.join(',')})`);
  }
  if (userId) {
    filters.push(`recipient_user_id.eq.${userId}`);
  }

  const { data, error } = await client
    .from('notifications')
    .select('*')
    .or(filters.join(','))
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { notifications: [], tableMissing: true };
    }
    throw new Error(error.message);
  }

  const allowedSet = new Set(reportIds);
  const rows = ((data ?? []) as Record<string, unknown>[])
    .map(normalizeNotificationRow)
    .filter(
      (row) =>
        allowedSet.has(row.report_id) ||
        (userId !== null && row.recipient_user_id === userId)
    );

  if (rows.length === 0) {
    return { notifications: [], tableMissing: false };
  }

  const neededReportIds = Array.from(
    new Set(rows.flatMap((n) => [n.report_id, n.matched_report_id]))
  );
  const { data: relatedReports } = await client
    .from('baggage_reports')
    .select('*')
    .in('id', neededReportIds);

  const reportMap = new Map<string, BaggageReportRecord>(
    ((relatedReports ?? []) as Record<string, unknown>[])
      .map(normalizeReportRow)
      .map((r) => [r.id, r])
  );

  const hydrated: BaggageNotificationWithReports[] = rows.map((row) => ({
    ...row,
    report: reportMap.get(row.report_id),
    matched_report: reportMap.get(row.matched_report_id),
  }));

  return { notifications: hydrated, tableMissing: false };
}

export async function fetchUnreadNotificationCount(
  reportIds: string[],
  userId: string | null
): Promise<number> {
  if (!activeClient || (reportIds.length === 0 && !userId)) return 0;

  try {
    const rpcRes = await activeClient.rpc('get_my_notifications', {
      p_report_ids: toNumericReportIds(reportIds),
      p_guest_token: userId ? null : getGuestClaimToken(),
    });
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return (rpcRes.data as Record<string, unknown>[]).filter((n) => !n.is_read).length;
    }
  } catch {
    // Fall back to direct count below if RPC is missing
  }

  const filters: string[] = [];
  if (reportIds.length > 0) {
    filters.push(`report_id.in.(${reportIds.join(',')})`);
  }
  if (userId) {
    filters.push(`recipient_user_id.eq.${userId}`);
  }

  try {
    const { count, error } = await activeClient
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .or(filters.join(','));

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const client = requireSupabase();
  const rpcRes = await client.rpc('mark_my_notifications_read', {
    p_notification_ids: [notificationId],
    p_report_ids: toNumericReportIds(getOwnedReportIds()),
    p_guest_token: getGuestClaimToken(),
  });

  if (!rpcRes.error) {
    emitBaggageDataUpdated();
    return;
  }
  if (!isMissingRpcError(rpcRes.error)) {
    throw new Error(formatSupabaseError(rpcRes.error, 'Failed to mark notification as read.'));
  }

  const { error } = await client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw new Error(error.message);
  emitBaggageDataUpdated();
}

export async function markAllNotificationsAsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const client = requireSupabase();
  const rpcRes = await client.rpc('mark_my_notifications_read', {
    p_notification_ids: notificationIds,
    p_report_ids: toNumericReportIds(getOwnedReportIds()),
    p_guest_token: getGuestClaimToken(),
  });

  if (!rpcRes.error) {
    emitBaggageDataUpdated();
    return;
  }
  if (!isMissingRpcError(rpcRes.error)) {
    throw new Error(formatSupabaseError(rpcRes.error, 'Failed to update notifications.'));
  }

  const { error } = await client
    .from('notifications')
    .update({ is_read: true })
    .in('id', notificationIds);

  if (error) throw new Error(error.message);
  emitBaggageDataUpdated();
}

async function hydrateConnectionRequests(
  requests: ConnectionRequestRecord[]
): Promise<ConnectionRequestDetailed[]> {
  if (requests.length === 0) return [];
  const client = requireSupabase();

  const reportIds = Array.from(
    new Set(requests.flatMap((r) => [r.requester_report_id, r.recipient_report_id]))
  );
  const matchIds = Array.from(new Set(requests.map((r) => r.match_id)));

  const [{ data: reports }, { data: matches }] = await Promise.all([
    client.from('baggage_reports').select('*').in('id', reportIds),
    client.from('baggage_matches').select('*').in('id', matchIds),
  ]);

  const reportMap = new Map<string, BaggageReportRecord>(
    ((reports ?? []) as Record<string, unknown>[])
      .map(normalizeReportRow)
      .map((r) => [r.id, r])
  );
  const matchMap = new Map<string, BaggageMatchRecord>(
    ((matches ?? []) as Record<string, unknown>[])
      .map(normalizeMatchRow)
      .map((m) => [m.id, m])
  );

  return requests.map((req) => ({
    ...req,
    requester_report: reportMap.get(req.requester_report_id),
    recipient_report: reportMap.get(req.recipient_report_id),
    match: matchMap.get(req.match_id),
  }));
}

export async function fetchConnectionRequestsForOwner(
  reportIds: string[],
  userId: string | null
): Promise<ConnectionRequestDetailed[]> {
  if (reportIds.length === 0 && !userId) return [];
  const client = requireSupabase();
  const filters: string[] = [];

  if (reportIds.length > 0) {
    const idList = reportIds.join(',');
    filters.push(`requester_report_id.in.(${idList})`);
    filters.push(`recipient_report_id.in.(${idList})`);
  }
  if (userId) {
    filters.push(`requester_id.eq.${userId}`);
    filters.push(`recipient_id.eq.${userId}`);
  }

  try {
    const { data, error } = await client
      .from('connection_requests')
      .select('*')
      .or(filters.join(','))
      .order('created_at', { ascending: false });

    if (error) return [];
    return hydrateConnectionRequests(
      ((data ?? []) as Record<string, unknown>[]).map(normalizeConnectionRow)
    );
  } catch {
    return [];
  }
}

export async function fetchConnectionRequestsByMatchId(
  matchId: string
): Promise<ConnectionRequestDetailed[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('connection_requests')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return hydrateConnectionRequests(
      ((data ?? []) as Record<string, unknown>[]).map(normalizeConnectionRow)
    );
  } catch {
    return [];
  }
}

export async function createConnectionRequest(params: {
  matchId: string;
  requesterId: string | null;
  recipientId: string | null;
  requesterReportId: string;
  recipientReportId: string;
  requesterEmail?: string;
  message: string;
}): Promise<ConnectionRequestRecord> {
  const client = requireSupabase();

  const { data: existing } = await client
    .from('connection_requests')
    .select('*')
    .eq('match_id', params.matchId)
    .eq('requester_report_id', params.requesterReportId)
    .maybeSingle();

  if (existing) {
    throw new Error('A connection request has already been sent for this report match.');
  }

  const { data, error } = await client
    .from('connection_requests')
    .insert({
      match_id: params.matchId,
      requester_id: params.requesterId,
      recipient_id: params.recipientId,
      requester_report_id: params.requesterReportId,
      recipient_report_id: params.recipientReportId,
      requester_email: params.requesterEmail?.trim() || null,
      message: params.message.trim(),
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not send connection request.');
  }

  await client
    .from('baggage_matches')
    .update({ status: 'under_review' })
    .eq('id', params.matchId);

  emitBaggageDataUpdated();
  return normalizeConnectionRow(data as Record<string, unknown>);
}

export async function respondToConnectionRequest(
  requestId: string,
  decision: 'approved' | 'declined',
  sharedContact?: string
): Promise<ConnectionRequestRecord> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('connection_requests')
    .update({
      status: decision,
      shared_contact: decision === 'approved' ? sharedContact ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update connection request.');
  }

  const updated = normalizeConnectionRow(data as Record<string, unknown>);

  if (decision === 'approved') {
    await Promise.all([
      client
        .from('baggage_matches')
        .update({ status: 'confirmed' })
        .eq('id', updated.match_id),
      client
        .from('baggage_reports')
        .update({ status: 'verification_pending' })
        .in('id', [updated.requester_report_id, updated.recipient_report_id]),
    ]);
  }

  emitBaggageDataUpdated();
  return updated;
}
