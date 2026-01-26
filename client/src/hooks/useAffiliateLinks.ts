import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { AffiliateLink } from '../types';

export function useAffiliateLinks() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const { data } = await api.get('/api/affiliate/links');
      return (data.items ?? []) as AffiliateLink[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<AffiliateLink>) => {
      const { data } = await api.post('/api/affiliate/links', payload);
      return data.item as AffiliateLink;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-links'] }),
  });

  const update = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<AffiliateLink> }) => {
      const { data } = await api.patch(`/api/affiliate/links/${args.id}`, args.patch);
      return data.item as AffiliateLink;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-links'] }),
  });

  return { ...q, create, update };
}
