import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  SkeletonBlock,
  StatusIndicator,
  Textarea,
} from '@/src/components/ui';
import { PinkSuitcaseMascot } from '@/src/components/illustrations';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  createConnectionRequest,
  fetchConnectionRequestsByMatchId,
  fetchMatchById,
  LOST_AND_FOUND_COLLECTION_MESSAGE,
  respondToConnectionRequest,
  STAFF_VERIFICATION_NOTICE,
} from '@/src/lib/baggageService';
import { getOwnedReportIds } from '@/src/lib/reportOwnership';
import {
  BAG_TYPE_OPTIONS,
  type BaggageMatchWithReports,
  type BaggageReportRecord,
  type ConnectionRequestDetailed,
} from '@/src/types/baggage';

function getBagLabel(type: string): string {
  return BAG_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function maskTag(tag: string | null): string {
  if (!tag) return 'Not provided';
  const cleaned = tag.replace(/\s+/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `•••• ••• ${cleaned.slice(-3)}`;
}

function ReportComparisonPanel({
  title,
  report,
  revealFullTag,
}: {
  title: string;
  report: BaggageReportRecord;
  revealFullTag: boolean;
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-lavender-300">{title}</span>
        <StatusIndicator status={report.report_type} />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold font-display text-slate-50">
          {report.color} {getBagLabel(report.bag_type)}
        </h2>
        <span className="font-mono text-xs text-pink-300 tabular-nums-mono">
          {report.reference_code || report.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-lavender-300/12 pt-4">
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Airport</dt>
          <dd className="text-slate-100">{report.airport}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Incident Date</dt>
          <dd className="font-mono text-slate-100 tabular-nums-mono">{report.incident_date}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Brand</dt>
          <dd className="text-slate-100">{report.brand || 'Unlisted'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Baggage Tag Number</dt>
          <dd className="font-mono text-lavender-200 tabular-nums-mono">
            {revealFullTag
              ? report.tag_number || 'Not provided'
              : report.tag_number
              ? maskTag(report.tag_number)
              : 'Protected until staff verification'}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Distinctive Features</dt>
          <dd className="text-slate-200 leading-relaxed mt-0.5">{report.distinctive_features}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function MatchDetailsPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch] = useState<BaggageMatchWithReports | null>(null);
  const [existingRequest, setExistingRequest] = useState<ConnectionRequestDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requesterEmail, setRequesterEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [loadedMatch, matchRequests] = await Promise.all([
        fetchMatchById(matchId),
        fetchConnectionRequestsByMatchId(matchId),
      ]);
      setMatch(loadedMatch);
      setExistingRequest(matchRequests[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load match details.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const emailCandidate = profile?.email || user?.email;
    if (emailCandidate && !requesterEmail) {
      setRequesterEmail(emailCandidate);
    }
  }, [profile, user, requesterEmail]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonBlock className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <Alert
          tone="error"
          title="Match details unavailable"
          description={error || 'This match record could not be found.'}
        />
        <Button
          variant="secondary"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Tracking
        </Button>
      </div>
    );
  }

  const ownedIds = new Set(getOwnedReportIds());
  const isReportAOwned =
    ownedIds.has(match.report_a.id) ||
    (user ? match.report_a.user_id === user.id : !ownedIds.has(match.report_b.id));

  const userReport = isReportAOwned ? match.report_a : match.report_b;
  const otherReport = isReportAOwned ? match.report_b : match.report_a;

  const isLostAndFoundPair =
    [match.report_a.report_type, match.report_b.report_type].sort().join(':') === 'found:lost';

  const isApproved = existingRequest?.status === 'approved';
  const isIncomingPending =
    existingRequest?.status === 'pending' &&
    existingRequest.recipient_report_id === userReport.id;

  const handleRequestConnection = async (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 8) {
      setError('Please write a brief verification note (at least 8 characters).');
      return;
    }

    const contactEmail = requesterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setError('Please enter a valid contact email so the other traveler can reach you once approved.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      await createConnectionRequest({
        matchId: match.id,
        requesterId: user?.id ?? null,
        recipientId: otherReport.user_id ?? null,
        requesterReportId: userReport.id,
        recipientReportId: otherReport.id,
        requesterEmail: contactEmail,
        message,
      });
      setFeedback('Connection request sent! The other traveler can review and approve your message.');
      setMessage('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send connection request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'declined') => {
    if (!existingRequest) return;
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      await respondToConnectionRequest(
        existingRequest.id,
        decision,
        decision === 'approved' ? profile?.email || user?.email || undefined : undefined
      );
      setFeedback(
        decision === 'approved'
          ? 'Connection approved! Contact information is now visible below.'
          : 'Connection request declined.'
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update connection request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-3"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/notifications')}
          >
            Back to Notifications
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold font-display text-slate-50">
              Match Comparison
            </h1>
            <span className="text-xl font-bold font-mono text-pink-300 tabular-nums-mono">
              {match.similarity_score}% Similarity
            </span>
          </div>
          <StatusIndicator status={match.status} />
        </div>

        <PinkSuitcaseMascot mood={isApproved ? 'matched' : 'searching'} size="md" />
      </div>

      {error && <Alert tone="error" title="Action error" description={error} />}
      {feedback && <Alert tone="success" title={feedback} />}

      <Alert
        tone={isLostAndFoundPair && userReport.report_type === 'lost' ? 'success' : 'info'}
        title={
          isLostAndFoundPair && userReport.report_type === 'lost'
            ? 'Next Step: Airport Desk Verification & Collection'
            : 'Airport Staff Ownership Verification Required'
        }
        description={
          isLostAndFoundPair && userReport.report_type === 'lost'
            ? LOST_AND_FOUND_COLLECTION_MESSAGE
            : STAFF_VERIFICATION_NOTICE
        }
      />

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Why these reports matched</CardTitle>
          <CardDescription>
            Similarity score combines airport alignment, incident date window, baggage tag number,
            and visual markers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {match.matching_signals.map((signal) => (
              <div key={signal} className="inline-flex items-center gap-2 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportComparisonPanel title="Your Tracked Report" report={userReport} revealFullTag />
        <ReportComparisonPanel
          title="Matched Traveler Report"
          report={otherReport}
          revealFullTag={isApproved}
        />
      </div>

      <Card padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-pink-400" aria-hidden="true" />
            <CardTitle>Secure Passenger Communication</CardTitle>
          </div>
          <CardDescription>
            Contact details are shared only when a connection request is submitted and approved.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {existingRequest ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusIndicator status={existingRequest.status} />
                <span className="text-xs text-slate-400">
                  Sent on{' '}
                  <span className="font-mono tabular-nums-mono">
                    {new Date(existingRequest.created_at).toLocaleDateString()}
                  </span>
                </span>
              </div>

              <p className="text-sm text-slate-200 p-4 rounded-xl bg-navy-900/70 border border-lavender-300/12">
                &ldquo;{existingRequest.message}&rdquo;
              </p>

              {isApproved && (
                <Alert
                  tone="success"
                  title="Communication Approved"
                  description={`Verified Contact Email: ${
                    existingRequest.requester_report_id === userReport.id
                      ? existingRequest.shared_contact || 'Approved in Connections'
                      : existingRequest.requester_email || 'Approved in Connections'
                  }`}
                />
              )}

              {isIncomingPending && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    variant="primary"
                    isLoading={submitting}
                    onClick={() => void handleDecision('approved')}
                  >
                    Approve Request
                  </Button>
                  <Button
                    variant="danger"
                    isLoading={submitting}
                    onClick={() => void handleDecision('declined')}
                  >
                    Decline Request
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRequestConnection} className="flex flex-col gap-4">
              <Input
                label="Your Contact Email"
                type="email"
                required
                placeholder="traveler@example.com"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Shared with the matched traveler only if they approve your verification."
              />

              <Textarea
                label="Verification Message"
                required
                placeholder="Share a quick detail to confirm ownership (e.g., last 4 tag digits or ribbon color)."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxCharacters={240}
                currentLength={message.length}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Request Connection
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
