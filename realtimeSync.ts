import { useEffect, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';

export const BAGGAGE_DATA_UPDATED_EVENT = 'retrievebag:data-updated';
export const NOTIFICATIONS_UPDATED_EVENT = 'retrievebag:notifications-updated';

export function emitBaggageDataUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BAGGAGE_DATA_UPDATED_EVENT));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

/**
 * Keeps dashboard counts, reports, automatic matches, and notifications updated live
 * without manual page refreshes—via local mutation events, Supabase Realtime Postgres
 * changes, window focus, and lightweight visible-tab background sync.
 */
export function useBaggageRealtimeSync(onSync: () => void, enabled = true): void {
  const callbackRef = useRef(onSync);
  callbackRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    let debounceTimer: number | null = null;
    const scheduleSync = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        callbackRef.current();
      }, 150);
    };

    const handleLocalEvent = () => {
      scheduleSync();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleSync();
      }
    };

    window.addEventListener(BAGGAGE_DATA_UPDATED_EVENT, handleLocalEvent);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleLocalEvent);
    window.addEventListener('focus', handleLocalEvent);
    document.addEventListener('visibilitychange', handleVisibility);

    // Light background sync for remote changes even if Realtime publication is not toggled on
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    }, 12000);

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (supabase) {
      const channelName = `retrieve-bag-sync-${Math.random().toString(36).slice(2, 10)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'baggage_reports' },
          scheduleSync
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'baggage_matches' },
          scheduleSync
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          scheduleSync
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'connection_requests' },
          scheduleSync
        )
        .subscribe();
    }

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener(BAGGAGE_DATA_UPDATED_EVENT, handleLocalEvent);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleLocalEvent);
      window.removeEventListener('focus', handleLocalEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(pollInterval);
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled]);
}
