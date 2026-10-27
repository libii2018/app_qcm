import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { QuizStats, StatsFilter } from '../types/api';

export function useStats(filter?: StatsFilter) {
  return useQuery<QuizStats, Error>({
    queryKey: ['stats', filter],
    queryFn: () => apiClient.getStats(filter),
  });
}
