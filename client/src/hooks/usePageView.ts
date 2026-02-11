import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

function getUtm() {
  const p = new URLSearchParams(window.location.search);
  const pick = (k: string) => p.get(k) || undefined;
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    utm_term: pick('utm_term'),
  };
}

/**
 * Tracks anonymous page views (public).
 * Safe: failures are ignored.
 */
export function usePageView(title?: string) {
  const loc = useLocation();

  useEffect(() => {
    const path = loc.pathname + (loc.search || '');
    const referrer = document.referrer || undefined;
    const utm = getUtm();

    api
      .post('/api/public/pageview', {
        path: loc.pathname,
        title: title || document.title || null,
        referrer: referrer || null,
        ...utm,
      })
      .catch(() => {
        // ignore (analytics must never break UX)
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);
}
