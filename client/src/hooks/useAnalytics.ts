import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { AnalyticsSummary } from '../types';

export function useAnalytics(from: string, to: string) {
  return useQuery({
    queryKey: ['analytics-summary', from, to],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/summary', { params: { from, to } });
      return data as AnalyticsSummary;
    },
    enabled: Boolean(from && to),
  });
}
