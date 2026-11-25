import { useCallback, useEffect, useRef } from 'react';
import { useFetcher, useLocation, useNavigate } from '@remix-run/react';
import { isNewer, NO_UNREAD, playChime, titleWithCount, type UnreadSummary } from '~/utils/alerts';
import type { LiveSource } from './useLiveUpdates';

const SUMMARY_URL = '/panel/mensajes/no-leidos';

/**
 * E2 — the business panel's unread count, on every panel page: asks for it at start, on
 * each «cambio» and after each navigation (reading happens in Mensajes). When a newer
 * message arrives and the person is not looking at that conversation it plays a chime and,
 * with the tab in the background and permission given, shows a notification that opens it.
 * Keeps «(n)» in front of the tab title.
 */
export function useUnreadAlerts(source: LiveSource): UnreadSummary {
  const fetcher = useFetcher<UnreadSummary>();
  const location = useLocation();
  const navigate = useNavigate();
  const load = useRef(fetcher.load);
  load.current = fetcher.load;
  const refresh = useCallback(() => load.current(SUMMARY_URL), []);

  useEffect(() => refresh(), [refresh, location.key]);
  useEffect(() => source.subscribe('cambio', refresh), [source, refresh]);

  const summary = fetcher.data ?? null;
  const announcedAt = useRef<string | null | undefined>(undefined);
  const where = useRef(location);
  where.current = location;

  useEffect(() => {
    if (!summary) return;
    const latest = summary.latest;
    // The first answer is what was already there: nothing to announce.
    if (announcedAt.current === undefined) {
      announcedAt.current = latest?.createdAt ?? null;
      return;
    }
    if (!latest || !isNewer(latest.createdAt, announcedAt.current)) return;
    announcedAt.current = latest.createdAt;

    const visible = document.visibilityState === 'visible';
    const here = where.current;
    const looking =
      visible && here.pathname.endsWith('/panel/mensajes') && new URLSearchParams(here.search).get('c') === latest.conversationId;
    if (looking) return;
    playChime();
    if (!visible && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notice = new Notification(latest.authorName, { body: latest.preview, tag: latest.conversationId });
        notice.onclick = () => {
          window.focus();
          navigate(`/panel/mensajes?c=${encodeURIComponent(latest.conversationId)}`);
          notice.close();
        };
      } catch {
        // Some browsers only notify from a service worker: the chime and the count remain.
      }
    }
  }, [summary, navigate]);

  const total = summary?.total ?? 0;
  useEffect(() => {
    document.title = titleWithCount(document.title, total);
  }, [total, location.key]);

  return summary ?? NO_UNREAD;
}
