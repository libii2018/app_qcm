import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { TodaySession } from '../types/api';

export function useTodaySession() {
  return useQuery<TodaySession, Error>({
    queryKey: ['today'],
    queryFn: () => apiClient.getTodaySession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
