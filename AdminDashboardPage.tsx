import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  SegmentedControl,
  Select,
  SkeletonBlock,
  StatMetricItem,
  StatusIndicator,
} from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchAllMatches,
  fetchAllReports,
  runSystemMatchScan,
  updateMatchStatus,
  updateReportStatus,
} from '@/src/lib/baggageService';
import {
  MATCH_STATUS_OPTIONS,
  REPORT_STATUS_OPTIONS,
  type BaggageMatchWithReports,
  type BaggageReportRecord,
  type MatchStatus,
  type ReportStatus,
} from '@/src/types/baggage';

type AdminTab = 'reports' | 'matches';

export function AdminDashboardPage() {
  const { profile, isConfigured } = useAuth();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin';

  const [tab, setTab] = useState<AdminTab>('reports');
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState<BaggageReportRecord[]>([]);
  const [matches, setMatches] = useState<BaggageMatchWithReports[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!isConfigured || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [allReports, allMatches] = await Promise.all([
        fetchAllReports(),
        fetchAllMatches(),
      ]);
      setReports(allReports);
      setMatches(allMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin records.');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, isAdmin]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleReportStatusChange = async (reportId: string, status: ReportStatus) => {
    setUpdatingId(reportId);
    setError(null);
    setFeedback(null);
    try {
      const updated = await updateReportStatus(reportId, status);
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
      setFeedback(`Updated report ${updated.reference_code} status.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMatchStatusChange = async (matchId: string, status: MatchStatus) => {
    setUpdatingId(matchId);
    setError(null);
    setFeedback(null);
    try {
      const updated = await updateMatchStatus(matchId, status);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: updated.status } : m))
      );
      setFeedback('Updated match status.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update match status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setError(null);
    setFeedback(null);
    try {
      const count = await runSystemMatchScan();
      setFeedback(`Match scan completed. Processed ${count} candidate match links.`);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match scan failed.');
    } finally {
      setScanning(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-8 flex flex-col gap-6">
        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-300 shrink-0" aria-hidden="true" />
            <h1 className="text-2xl font-bold font-display text-slate-50">
              Admin Authorization Required
            </h1>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your signed-in account currently has the{' '}
            <span className="font-mono text-lavender-200">{profile?.role || 'passenger'}</span>{' '}
            role. Airport staff review and global match management require{' '}
            <span className="font-mono text-pink-300">role = &apos;admin&apos;</span> in your
            Supabase <code className="font-mono text-lavender-200">profiles</code> table.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => navigate('/login', { state: { from: '/admin' } })}>
              Staff Sign In
            </Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Track &amp; Matches
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const filteredReports = reports.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.reference_code ?? '').toLowerCase().includes(q) ||
      r.airport.toLowerCase().includes(q) ||
      (r.tag_number ?? '').toLowerCase().includes(q) ||
      (r.brand ?? '').toLowerCase().includes(q) ||
      r.color.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-lavender-300">
            Airport Operations · Admin Console
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-50">
            Baggage Operations &amp; Match Review
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Audit passenger reports, trigger cross-airport match scans, and update case statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="lavender"
            size="sm"
            isLoading={scanning}
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={() => void handleRunScan()}
          >
            Run Match Scan
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void loadAdminData()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert tone="error" title="Operation failed" description={error} />}
      {feedback && <Alert tone="success" title={feedback} />}

      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-lavender-300/12">
          <div className="sm:pr-6">
            <StatMetricItem label="Total Reports" value={reports.length} />
          </div>
          <div className="pt-4 sm:pt-0 sm:px-6">
            <StatMetricItem
              label="Reunited Cases"
              value={reports.filter((r) => r.status === 'reunited').length}
            />
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <StatMetricItem label="Tracked Matches" value={matches.length} />
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SegmentedControl
          ariaLabel="Admin views"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'reports', label: `All Reports (${reports.length})` },
            { value: 'matches', label: `Manage Matches (${matches.length})` },
          ]}
        />

        {tab === 'reports' && (
          <div className="w-full sm:w-72">
            <Input
              label="Filter reports"
              placeholder="Ref code, airport, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
        </div>
      ) : tab === 'reports' ? (
        filteredReports.length === 0 ? (
          <EmptyState
            title="No reports found"
            description="Submitted passenger reports will appear here for review."
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="divide-y divide-lavender-300/12">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-navy-800/40 transition-colors"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="font-mono font-semibold text-pink-300 tabular-nums-mono">
                        {report.reference_code || report.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <StatusIndicator status={report.report_type} />
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <span className="text-slate-200">{report.airport}</span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <span className="font-mono text-slate-400 tabular-nums-mono">
                        {report.incident_date}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-100">
                      {report.color} {report.bag_type.replace('_', ' ')} —{' '}
                      {report.distinctive_features}
                    </p>
                    <p className="text-xs text-slate-400">
                      {report.brand ? `Brand: ${report.brand}` : 'Brand unlisted'} ·{' '}
                      {report.tag_number ? `Tag: ${report.tag_number}` : 'No tag number'}
                    </p>
                  </div>

                  <div className="w-full sm:w-56 shrink-0">
                    <Select
                      label="Case Status"
                      options={REPORT_STATUS_OPTIONS}
                      value={report.status}
                      disabled={updatingId === report.id}
                      onChange={(e) =>
                        void handleReportStatusChange(report.id, e.target.value as ReportStatus)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      ) : matches.length === 0 ? (
        <EmptyState
          title="No matches recorded"
          description="Click Run Match Scan to evaluate open reports across airports."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="divide-y divide-lavender-300/12">
            {matches.map((match) => (
              <div
                key={match.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-navy-800/40 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono font-bold text-pink-300 tabular-nums-mono">
                      {match.similarity_score}% Match
                    </span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span className="font-mono text-lavender-200">
                      {match.report_a.reference_code} ↔ {match.report_b.reference_code}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <StatusIndicator status={match.status} />
                  </div>

                  <p className="text-sm text-slate-200">
                    {match.report_a.airport} · Signals: {match.matching_signals.join(', ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-3 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/matches/${match.id}`)}
                  >
                    Inspect
                  </Button>
                  <div className="w-48">
                    <Select
                      label="Match Status"
                      options={MATCH_STATUS_OPTIONS}
                      value={match.status}
                      disabled={updatingId === match.id}
                      onChange={(e) =>
                        void handleMatchStatusChange(match.id, e.target.value as MatchStatus)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
