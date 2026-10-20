import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { UserSettings } from '@qcm/shared';

export function useSettings() {
  return useQuery<UserSettings, Error>({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation<UserSettings, Error, UserSettings>({
    mutationFn: (settings) => apiClient.updateSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
    },
  });
}
