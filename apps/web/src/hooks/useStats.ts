import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { QuizStats } from '@qcm/shared';
import { StatsFilter } from '../types/api';

export function useStats(filter?: StatsFilter) {
  return useQuery<QuizStats, Error>({
    queryKey: ['stats', filter],
    queryFn: () => apiClient.getStats(filter),
  });
}
