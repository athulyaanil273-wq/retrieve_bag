import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Luggage,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  SegmentedControl,
  SkeletonBlock,
  StatMetricItem,
  StatusIndicator,
} from '@/src/components/ui';
import { PinkSuitcaseMascot } from '@/src/components/illustrations';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchNotificationsForOwner,
  fetchOwnedAndUserReports,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  STAFF_VERIFICATION_NOTICE,
} from '@/src/lib/baggageService';
import { useBaggageRealtimeSync } from '@/src/lib/realtimeSync';
import { getOwnedReportIds } from '@/src/lib/reportOwnership';
import {
  BAG_TYPE_OPTIONS,
  type BaggageNotificationWithReports,
} from '@/src/types/baggage';

type NotificationFilter = 'all' | 'unread';

function getBagTypeLabel(value?: string): string {
  if (!value) return 'Baggage';
  return BAG_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function NotificationsPage() {
  const { user, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<BaggageNotificationWithReports[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadNotifications = useCallback(
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
        const reports = await fetchOwnedAndUserReports(user?.id ?? null, ownedIds);
        setReportCount(reports.length);

        const allOwnedIds = Array.from(new Set([...ownedIds, ...reports.map((r) => r.id)]));
        const res = await fetchNotificationsForOwner(allOwnedIds, user?.id ?? null);
        setNotifications(res.notifications);
        setTableMissing(res.tableMissing);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load notifications.');
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [user, isConfigured]
  );

  useEffect(() => {
    void loadNotifications(true);
  }, [loadNotifications]);

  useBaggageRealtimeSync(() => {
    void loadNotifications(false);
  }, isConfigured);

  const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
  const unreadCount = unreadIds.length;

  const handleMarkRead = async (notificationId: string) => {
    setBusyId(notificationId);
    setError(null);
    setFeedback(null);
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    setError(null);
    setFeedback(null);
    try {
      await markAllNotificationsAsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setFeedback('All notifications marked as read.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notifications.');
    } finally {
      setMarkingAll(false);
    }
  };

  const visibleNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-lavender-300">
            Automatic Match Alerts
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-50">
            Notifications
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Every submitted report is checked automatically against incoming baggage filings. Strong
            matches and airport collection instructions appear right here—no manual searching needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={markingAll}
              leftIcon={<Check className="w-4 h-4" />}
              onClick={() => void handleMarkAllRead()}
            >
              Mark All as Read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void loadNotifications(true)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {!isConfigured && (
        <Alert
          tone="warning"
          title="Supabase connection required"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load persistent baggage match notifications."
        />
      )}

      {tableMissing && (
        <Alert
          tone="warning"
          title="Notifications table migration pending"
          description="Run supabase/notifications.sql in your Supabase SQL Editor to enable persistent notifications storage."
        />
      )}

      {error && <Alert tone="error" title="Could not load notifications" description={error} />}
      {feedback && <Alert tone="success" title={feedback} />}

      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-lavender-300/12">
          <div className="sm:pr-6">
            <StatMetricItem
              label="Unread Alerts"
              value={unreadCount}
              detail="New baggage match notifications"
              icon={<Bell className="w-4 h-4" />}
            />
          </div>
          <div className="pt-4 sm:pt-0 sm:px-6">
            <StatMetricItem
              label="Total Notifications"
              value={notifications.length}
              detail="Saved across revisits"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <StatMetricItem
              label="Monitored Reports"
              value={reportCount}
              detail="Active on this account or browser"
              icon={<Luggage className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      <Alert
        tone="info"
        title="Airport staff ownership verification required"
        description={STAFF_VERIFICATION_NOTICE}
      />

      <div className="flex items-center justify-between gap-4">
        <SegmentedControl
          ariaLabel="Filter notifications"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All (${notifications.length})` },
            { value: 'unread', label: `Unread (${unreadCount})` },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
        </div>
      ) : visibleNotifications.length === 0 ? (
        <EmptyState
          illustration={<PinkSuitcaseMascot mood="searching" size="md" />}
          title={
            filter === 'unread'
              ? 'No unread notifications'
              : 'No match notifications yet'
          }
          description={
            reportCount === 0
              ? 'Submit a Lost, Found, or Exchanged bag report and Retrieve Bag will notify you automatically when a match is detected.'
              : 'We are automatically comparing your submitted report against new filings. Any strong match will appear here.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" onClick={() => navigate('/report/lost')}>
                Report a Lost Bag
              </Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                View My Reports
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visibleNotifications.map((item) => {
            const isUnread = !item.is_read;

            return (
              <Card
                key={item.id}
                padding="lg"
                className={
                  isUnread
                    ? 'border-pink-400/45 bg-navy-850'
                    : 'border-lavender-300/12 bg-navy-850/70'
                }
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span
                        className={
                          isUnread
                            ? 'font-semibold text-pink-300'
                            : 'font-medium text-slate-400'
                        }
                      >
                        {isUnread ? 'Unread Alert' : 'Read'}
                      </span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <span className="font-mono font-bold text-pink-300 tabular-nums-mono">
                        {item.similarity_score}% Match
                      </span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <span className="font-mono text-slate-400 tabular-nums-mono">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.report && (
                        <>
                          <span aria-hidden="true" className="text-slate-500">·</span>
                          <StatusIndicator status={item.report.report_type} />
                        </>
                      )}
                    </div>

                    <div className="flex items-start gap-2.5">
                      <ShieldCheck
                        className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-1.5">
                        <h2 className="text-lg font-semibold font-display text-slate-50">
                          {item.title}
                        </h2>
                        <p className="text-sm text-slate-100 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {(item.report || item.matched_report) && (
                      <div className="mt-1 pt-3 border-t border-lavender-300/12 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                        {item.report && (
                          <div>
                            <span className="text-slate-400">Your Report: </span>
                            <span className="text-slate-100 font-medium">
                              {item.report.color} {getBagTypeLabel(item.report.bag_type)}
                            </span>{' '}
                            <span>at {item.report.airport}</span>
                          </div>
                        )}
                        {item.matched_report && (
                          <div>
                            <span className="text-slate-400">Matched Report: </span>
                            <span className="text-slate-100 font-medium">
                              {item.matched_report.color}{' '}
                              {getBagTypeLabel(item.matched_report.bag_type)}
                            </span>{' '}
                            <span>at {item.matched_report.airport}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {isUnread && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={busyId === item.id}
                        leftIcon={<Check className="w-4 h-4" />}
                        onClick={() => void handleMarkRead(item.id)}
                      >
                        Mark as Read
                      </Button>
                    )}

                    {item.match_id && (
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        onClick={() => navigate(`/matches/${item.match_id}`)}
                      >
                        View Match Details
                      </Button>
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
