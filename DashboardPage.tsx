import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  CheckCircle2,
  Luggage,
  MessageSquare,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Modal,
  SegmentedControl,
  SkeletonBlock,
  StatMetricItem,
  StatusIndicator,
} from '@/src/components/ui';
import { PinkSuitcaseMascot } from '@/src/components/illustrations';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  computeDashboardCounts,
  deleteBaggageReport,
  fetchConnectionRequestsForOwner,
  fetchMatchesForReportIds,
  fetchOwnedAndUserReports,
  fetchUnreadNotificationCount,
  respondToConnectionRequest,
  updateReportStatus,
} from '@/src/lib/baggageService';
import { useBaggageRealtimeSync } from '@/src/lib/realtimeSync';
import { getOwnedReportIds } from '@/src/lib/reportOwnership';
import {
  BAG_TYPE_OPTIONS,
  type BaggageMatchWithReports,
  type BaggageReportRecord,
  type ConnectionRequestDetailed,
} from '@/src/types/baggage';

type DashboardTab = 'reports' | 'matches' | 'connections';

function getBagTypeLabel(value: string): string {
  return BAG_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function DashboardPage() {
  const { user, profile, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>('reports');
  const [reports, setReports] = useState<BaggageReportRecord[]>([]);
  const [matches, setMatches] = useState<BaggageMatchWithReports[]>([]);
  const [connections, setConnections] = useState<ConnectionRequestDetailed[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [reportPendingDelete, setReportPendingDelete] = useState<BaggageReportRecord | null>(null);
  const [deletingReport, setDeletingReport] = useState(false);

  const loadDashboard = useCallback(
    async (showSpinner = true) => {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const ownedIds = getOwnedReportIds();
        const myReports = await fetchOwnedAndUserReports(user?.id ?? null, ownedIds);
        const ids = Array.from(new Set([...ownedIds, ...myReports.map((r) => r.id)]));

        const [foundMatches, foundConnections, unreadCount] = await Promise.all([
          fetchMatchesForReportIds(ids),
          fetchConnectionRequestsForOwner(ids, user?.id ?? null),
          fetchUnreadNotificationCount(ids, user?.id ?? null),
        ]);

        setReports(myReports);
        setMatches(foundMatches);
        setConnections(foundConnections);
        setUnreadNotifications(unreadCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [user, isConfigured]
  );

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useBaggageRealtimeSync(() => {
    void loadDashboard(false);
  }, isConfigured);

  const handleRespondConnection = async (
    requestId: string,
    decision: 'approved' | 'declined'
  ) => {
    setBusyRequestId(requestId);
    setActionFeedback(null);
    setError(null);
    try {
      await respondToConnectionRequest(
        requestId,
        decision,
        decision === 'approved' ? profile?.email || user?.email || undefined : undefined
      );
      setActionFeedback(
        decision === 'approved'
          ? 'Connection approved.'
          : 'Connection request declined.'
      );
      await loadDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update connection request.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleMarkReunited = async (report: BaggageReportRecord) => {
    setError(null);
    setActionFeedback(null);
    try {
      await updateReportStatus(report.id, 'reunited');
      setActionFeedback(`Marked ${report.reference_code || report.id} as Bag Reunited.`);
      await loadDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update report status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!reportPendingDelete) return;
    setDeletingReport(true);
    setError(null);
    setActionFeedback(null);
    try {
      await deleteBaggageReport(reportPendingDelete.id);
      setActionFeedback(
        `Deleted report ${reportPendingDelete.reference_code || reportPendingDelete.id}.`
      );
      setReportPendingDelete(null);
      await loadDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete report.');
    } finally {
      setDeletingReport(false);
    }
  };

  const trackedIds = new Set(reports.map((r) => r.id));
  const counts = computeDashboardCounts(reports, matches, connections);
  const validMatches = matches.filter((m) => m.status !== 'dismissed');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-lavender-300">
            Track &amp; Match · {profile?.full_name || user?.email || 'Direct Passenger Access'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-50">
            My Reports &amp; Automatic Matches
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Every report you submit is matched automatically in the background—no manual search
            required. Counts and notifications update live whenever reports or matches change.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Luggage className="w-4 h-4" />}
            onClick={() => navigate('/report/lost')}
          >
            Lost Bag
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Search className="w-4 h-4" />}
            onClick={() => navigate('/report/found')}
          >
            Found Bag
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeftRight className="w-4 h-4" />}
            onClick={() => navigate('/report/exchanged')}
          >
            Exchanged Bag
          </Button>
          <Button
            variant="lavender"
            size="sm"
            leftIcon={<Bell className="w-4 h-4" />}
            onClick={() => navigate('/notifications')}
          >
            Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
          </Button>
        </div>
      </div>

      {unreadNotifications > 0 && (
        <Alert
          tone="success"
          title={`You have ${unreadNotifications} unread baggage match notification${
            unreadNotifications > 1 ? 's' : ''
          }`}
          description="Open Notifications to view match alerts and airport baggage desk collection instructions."
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/notifications')}>
              Open Notifications
            </Button>
          }
        />
      )}

      {!isConfigured && (
        <Alert
          tone="warning"
          title="Supabase configuration missing"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to save and load live baggage reports and matches."
        />
      )}

      {error && (
        <Alert
          tone="error"
          title="Error loading dashboard"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadDashboard(true)}>
              Retry
            </Button>
          }
        />
      )}

      {actionFeedback && <Alert tone="success" title={actionFeedback} />}

      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-lavender-300/12">
          <div className="sm:pr-6">
            <StatMetricItem
              label="Submitted Reports"
              value={counts.submittedReports}
              detail="Lost, found, and exchanged reports"
              icon={<Luggage className="w-4 h-4" />}
            />
          </div>
          <div className="pt-4 sm:pt-0 sm:px-6">
            <StatMetricItem
              label="Automatic Matches"
              value={counts.automaticMatches}
              detail="Detected by tag, traits, airport & date"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <StatMetricItem
              label="Pending"
              value={counts.pending}
              detail={`${counts.pendingReports} active reports · ${counts.pendingRequests} open requests`}
              icon={<MessageSquare className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SegmentedControl
          ariaLabel="Dashboard sections"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'reports', label: `My Reports (${counts.submittedReports})` },
            { value: 'matches', label: `Matches (${counts.automaticMatches})` },
            { value: 'connections', label: `Connections (${connections.length})` },
          ]}
        />

        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => void loadDashboard(true)}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-44" />
        </div>
      ) : activeTab === 'reports' ? (
        reports.length === 0 ? (
          <EmptyState
            illustration={<PinkSuitcaseMascot mood="searching" size="md" />}
            title="No reports submitted yet"
            description="Submit a Lost, Found, or Exchanged bag report directly—no sign-in or manual searching required."
            action={
              <Button variant="primary" onClick={() => navigate('/report/lost')}>
                Report a Bag Now
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reports.map((report) => (
              <Card key={report.id} padding="lg" className="flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-pink-300 tabular-nums-mono">
                      {report.reference_code || report.id.slice(0, 8).toUpperCase()}
                    </span>
                    <StatusIndicator status={report.status} />
                  </div>

                  <CardHeader>
                    <CardTitle>
                      {report.color} {getBagTypeLabel(report.bag_type)}
                      {report.brand ? ` · ${report.brand}` : ''}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <StatusIndicator status={report.report_type} />
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200">{report.airport}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums-mono">{report.incident_date}</span>
                    </div>
                  </CardHeader>

                  <p className="text-sm text-slate-300 line-clamp-2">
                    {report.distinctive_features}
                  </p>
                </div>

                <div className="pt-3 border-t border-lavender-300/12 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <span>
                    {report.tag_number ? (
                      <>
                        Tag <span className="font-mono text-lavender-200">{report.tag_number}</span>
                      </>
                    ) : (
                      'No tag number recorded'
                    )}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {validMatches.some(
                      (m) => m.report_a_id === report.id || m.report_b_id === report.id
                    ) && (
                      <Button
                        variant="lavender"
                        size="sm"
                        onClick={() => setActiveTab('matches')}
                      >
                        View Matches
                      </Button>
                    )}

                    {report.status !== 'reunited' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleMarkReunited(report)}
                      >
                        Mark Reunited
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReportPendingDelete(report)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'matches' ? (
        validMatches.length === 0 ? (
          <EmptyState
            illustration={<PinkSuitcaseMascot mood="helper" size="md" />}
            title="No potential matches yet"
            description="Retrieve Bag automatically compares your reports against all incoming filings and notifies you whenever a strong match appears."
            action={
              <Button variant="secondary" onClick={() => navigate('/notifications')}>
                Check Notifications
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {validMatches.map((match) => {
              const isReportAOwned = trackedIds.has(match.report_a_id);
              const yours = isReportAOwned ? match.report_a : match.report_b;
              const candidate = isReportAOwned ? match.report_b : match.report_a;

              return (
                <Card key={match.id} padding="lg" className="flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xl font-bold font-mono text-pink-300 tabular-nums-mono">
                        {match.similarity_score}% Match
                      </span>
                      <StatusIndicator status={match.status} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold text-slate-50">
                        {candidate.color} {getBagTypeLabel(candidate.bag_type)}
                        {candidate.brand ? ` · ${candidate.brand}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">
                        Matched against your {yours.report_type} report at {candidate.airport}
                      </p>
                    </div>

                    <ul className="flex flex-col gap-1 text-xs text-slate-300">
                      {match.matching_signals.slice(0, 3).map((signal) => (
                        <li key={signal} className="flex items-center gap-2">
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-emerald-300 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => navigate(`/matches/${match.id}`)}
                  >
                    View Match Details
                  </Button>
                </Card>
              );
            })}
          </div>
        )
      ) : connections.length === 0 ? (
        <EmptyState
          illustration={<PinkSuitcaseMascot mood="greeting" size="md" />}
          title="No connection requests yet"
          description="Open an automatic match to send a verification message or approve an incoming request."
          action={
            <Button variant="secondary" onClick={() => setActiveTab('matches')}>
              Browse Matches
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {connections.map((req) => {
            const isIncoming = user
              ? req.recipient_id === user.id
              : trackedIds.has(req.recipient_report_id);
            const isBusy = busyRequestId === req.id;

            return (
              <Card key={req.id} padding="lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-lavender-300">
                        {isIncoming ? 'Incoming Request' : 'Sent Request'}
                      </span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <StatusIndicator status={req.status} />
                      {req.match && (
                        <>
                          <span aria-hidden="true" className="text-slate-500">·</span>
                          <span className="text-xs font-mono text-pink-300 tabular-nums-mono">
                            {req.match.similarity_score}% Match
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-slate-100 leading-relaxed">&ldquo;{req.message}&rdquo;</p>

                    {req.status === 'approved' && req.shared_contact && (
                      <p className="text-sm font-medium text-emerald-300">
                        Approved Contact Email:{' '}
                        <span className="font-mono underline">{req.shared_contact}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/matches/${req.match_id}`)}
                    >
                      Inspect Match
                    </Button>

                    {isIncoming && req.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isBusy}
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                          onClick={() => void handleRespondConnection(req.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={isBusy}
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => void handleRespondConnection(req.id, 'declined')}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(reportPendingDelete)}
        onClose={() => !deletingReport && setReportPendingDelete(null)}
        title="Delete Baggage Report?"
        description="This permanently removes the report and any associated match links."
        footer={
          <>
            <Button
              variant="ghost"
              disabled={deletingReport}
              onClick={() => setReportPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={deletingReport}
              onClick={() => void handleConfirmDelete()}
            >
              Delete Report
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete report{' '}
          <span className="font-mono font-semibold text-pink-300">
            {reportPendingDelete?.reference_code || reportPendingDelete?.id}
          </span>
          ?
        </p>
      </Modal>
    </div>
  );
}
