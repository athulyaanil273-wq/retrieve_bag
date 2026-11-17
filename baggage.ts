export type ReportType = 'lost' | 'found' | 'exchanged';

export type BaggageType =
  | 'hardshell_spinner'
  | 'softshell_suitcase'
  | 'duffel_bag'
  | 'backpack'
  | 'garment_bag'
  | 'other';

export type ReportStatus =
  | 'open'
  | 'potential_match'
  | 'verification_pending'
  | 'reunited'
  | 'closed';

export type MatchStatus = 'suggested' | 'under_review' | 'confirmed' | 'dismissed';

export type ConnectionStatus = 'pending' | 'approved' | 'declined';

export type UserRole = 'passenger' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface BaggageReportRecord {
  id: string;
  reference_code?: string | null;
  user_id?: string | null;
  report_type: ReportType;
  status: ReportStatus;
  airport: string;
  incident_date: string;
  bag_type: string;
  color: string;
  brand: string | null;
  tag_number: string | null;
  distinctive_features: string;
  created_at: string;
}

export interface BaggageMatchRecord {
  id: string;
  report_a_id: string;
  report_b_id: string;
  similarity_score: number;
  matching_signals: string[];
  status: MatchStatus;
  created_at: string;
}

export interface BaggageMatchWithReports extends BaggageMatchRecord {
  report_a: BaggageReportRecord;
  report_b: BaggageReportRecord;
}

export interface ConnectionRequestRecord {
  id: string;
  match_id: string;
  requester_id: string | null;
  recipient_id: string | null;
  requester_report_id: string;
  recipient_report_id: string;
  requester_email?: string | null;
  message: string;
  status: ConnectionStatus;
  shared_contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionRequestDetailed extends ConnectionRequestRecord {
  match?: BaggageMatchRecord;
  requester_report?: BaggageReportRecord;
  recipient_report?: BaggageReportRecord;
}

export interface BaggageNotificationRecord {
  id: string;
  report_id: string;
  matched_report_id: string;
  match_id: string | null;
  recipient_user_id: string | null;
  title: string;
  message: string;
  similarity_score: number;
  is_read: boolean;
  created_at: string;
}

export interface BaggageNotificationWithReports extends BaggageNotificationRecord {
  report?: BaggageReportRecord;
  matched_report?: BaggageReportRecord;
}

export interface CreateBaggageReportInput {
  report_type: ReportType;
  airport: string;
  incident_date: string;
  bag_type: BaggageType;
  color: string;
  brand?: string;
  tag_number?: string;
  distinctive_features: string;
}

export const BAG_TYPE_OPTIONS: { value: BaggageType; label: string }[] = [
  { value: 'hardshell_spinner', label: 'Hardshell Spinner Suitcase' },
  { value: 'softshell_suitcase', label: 'Softshell Rolling Suitcase' },
  { value: 'duffel_bag', label: 'Duffel / Weekender Bag' },
  { value: 'backpack', label: 'Travel Backpack' },
  { value: 'garment_bag', label: 'Garment / Suit Carrier' },
  { value: 'other', label: 'Other Specialty Case' },
];

export const BAG_COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: 'Black', label: 'Black' },
  { value: 'Navy', label: 'Navy / Dark Blue' },
  { value: 'Silver', label: 'Silver / Gray' },
  { value: 'Pink', label: 'Pink / Rose' },
  { value: 'Lavender', label: 'Lavender / Purple' },
  { value: 'Red', label: 'Red / Burgundy' },
  { value: 'Green', label: 'Green / Olive' },
  { value: 'Beige', label: 'Beige / Champagne' },
  { value: 'Other', label: 'Multicolor / Other' },
];

export const REPORT_STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Searching for Match' },
  { value: 'potential_match', label: 'Potential Match Found' },
  { value: 'verification_pending', label: 'Verification Pending' },
  { value: 'reunited', label: 'Bag Reunited' },
  { value: 'closed', label: 'Closed' },
];

export const MATCH_STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'confirmed', label: 'Confirmed Match' },
  { value: 'dismissed', label: 'Dismissed' },
];

export interface AppRouteDefinition {
  path: string;
  label: string;
  description: string;
}

export const PLANNED_ROUTES: AppRouteDefinition[] = [
  {
    path: '/',
    label: 'Landing Overview',
    description: 'Guided passenger intake and quick report triage.',
  },
  {
    path: '/report/lost',
    label: 'Report Lost Bag',
    description: 'Submit details for luggage missing at arrival or transit.',
  },
  {
    path: '/report/found',
    label: 'Report Found Bag',
    description: 'Log an unattended or found bag at the airport.',
  },
  {
    path: '/report/exchanged',
    label: 'Report Exchanged Bag',
    description: 'Log accidentally swapped luggage details.',
  },
  {
    path: '/notifications',
    label: 'Notifications',
    description: 'Automatic matching alerts and airport baggage desk collection instructions.',
  },
  {
    path: '/dashboard',
    label: 'Track & Matches',
    description: 'View your submitted reports, automatic matches, and connection requests.',
  },
  {
    path: '/admin',
    label: 'Admin Dashboard',
    description: 'Review reports, manage matches, and update case statuses.',
  },
];
