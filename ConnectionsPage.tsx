import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Mail, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  SegmentedControl,
  SkeletonBlock,
  StatusIndicator,
} from '@/src/components/ui';
import { PinkSuitcaseMascot } from '@/src/components/illustrations';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchConnectionRequestsForOwner,
  fetchOwnedAndUserReports,
  respondToConnectionRequest,
} from '@/src/lib/baggageService';
import { useBaggageRealtimeSync } from '@/src/lib/realtimeSync';
import { getOwnedReportIds } from '@/src/lib/reportOwnership';
import type { ConnectionRequestDetailed } from '@/src/types/baggage';

type FilterKind = 'all' | 'incoming' | 'outgoing';

export function ConnectionsPage() {
  const { user, profile, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [trackedReportIds, setTrackedReportIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [requests, setRequests] = useState<ConnectionRequestDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(
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
        const ownedReports = await fetchOwnedAndUserReports(user?.id ?? null, ownedIds);
        const allIds = Array.from(new Set([...ownedIds, ...ownedReports.map((r) => r.id)]));

        setTrackedReportIds(allIds);
        const data = await fetchConnectionRequestsForOwner(allIds, user?.id ?? null);
        setRequests(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load connection requests.');
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [user, isConfigured]
  );

  useEffect(() => {
    void loadRequests(true);
  }, [loadRequests]);

  useBaggageRealtimeSync(() => {
    void loadRequests(false);
  }, isConfigured);

  const handleDecision = async (
    requestId: string,
    decision: 'approved' | 'declined',
    recipientEmail?: string
  ) => {
    setBusyId(requestId);
    setError(null);
    setFeedback(null);

    try {
      await respondToConnectionRequest(
        requestId,
        decision,
        decision === 'approved'
          ? recipientEmail || profile?.email || user?.email || undefined
          : undefined
      );
      setFeedback(
        decision === 'approved'
          ? 'Connection approved! Your email is now visible to the matched traveler.'
          : 'Connection request declined.'
      );
      await loadRequests(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update connection request.');
    } finally {
      setBusyId(null);
    }
  };

  const trackedSet = new Set(trackedReportIds);

  const filtered = requests.filter((req) => {
    const isIncoming = user ? req.recipient_id === user.id : trackedSet.has(req.recipient_report_id);
    const isOutgoing = user ? req.requester_id === user.id : trackedSet.has(req.requester_report_id);
    if (filter === 'incoming') return isIncoming;
    if (filter === 'outgoing') return isOutgoing;
    return true;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-lavender-300">
            Secure Passenger Coordination
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-50">
            Connection Requests
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Review verification messages and coordinate ownership checks through the airport
            baggage service/front desk before handing over any luggage.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => void loadRequests()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error && <Alert tone="error" title="Could not load requests" description={error} />}
      {feedback && <Alert tone="success" title={feedback} />}

      <div className="flex items-center justify-between gap-4">
        <SegmentedControl
          ariaLabel="Filter connection requests"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All (${requests.length})` },
            {
              value: 'incoming',
              label: `Incoming (${
                requests.filter((r) =>
                  user ? r.recipient_id === user.id : trackedSet.has(r.recipient_report_id)
                ).length
              })`,
            },
            {
              value: 'outgoing',
              label: `Outgoing (${
                requests.filter((r) =>
                  user ? r.requester_id === user.id : trackedSet.has(r.requester_report_id)
                ).length
              })`,
            },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration={<PinkSuitcaseMascot mood="helper" size="md" />}
          title="No connection requests in this view"
          description="Open an automatic match from Notifications or My Reports to verify details."
          action={
            <Button variant="primary" onClick={() => navigate('/notifications')}>
              Open Notifications
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((req) => {
            const isIncoming = user
              ? req.recipient_id === user.id
              : trackedSet.has(req.recipient_report_id);
            const otherReport = isIncoming ? req.requester_report : req.recipient_report;

            return (
              <Card key={req.id} padding="lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="font-semibold text-lavender-300">
                        {isIncoming ? 'Incoming Request' : 'Sent Request'}
                      </span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <StatusIndicator status={req.status} />
                      {req.match && (
                        <>
                          <span aria-hidden="true" className="text-slate-500">·</span>
                          <span className="font-mono text-pink-300 tabular-nums-mono">
                            {req.match.similarity_score}% Match
                          </span>
                        </>
                      )}
                      {otherReport && (
                        <>
                          <span aria-hidden="true" className="text-slate-500">·</span>
                          <span className="font-mono text-slate-300">
                            {otherReport.reference_code || otherReport.id.slice(0, 8)} (
                            {otherReport.airport})
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-slate-100 leading-relaxed">&ldquo;{req.message}&rdquo;</p>

                    {req.status === 'approved' && (
                      <div className="inline-flex items-center gap-2 text-sm text-emerald-300 font-medium pt-1">
                        <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          Contact:{' '}
                          <span className="font-mono">
                            {isIncoming
                              ? req.requester_email || 'Verified'
                              : req.shared_contact || 'Verified'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/matches/${req.match_id}`)}
                    >
                      View Match
                    </Button>

                    {isIncoming && req.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={busyId === req.id}
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                          onClick={() => void handleDecision(req.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={busyId === req.id}
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => void handleDecision(req.id, 'declined')}
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
    </div>
  );
}
