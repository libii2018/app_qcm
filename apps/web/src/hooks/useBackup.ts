import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { BackupResponse } from '../types/api';

export function useCreateBackup() {
  return useMutation<BackupResponse, Error>({
    mutationFn: () => apiClient.createBackup(),
  });
}

export function useRestoreBackup() {
  return useMutation<void, Error, File>({
    mutationFn: (file) => apiClient.restoreBackup(file),
  });
}

export function useDownloadBackup() {
  return useQuery<Blob, Error>({
    queryKey: ['backup-download'],
    queryFn: () => apiClient.downloadBackup(),
    enabled: false,
  });
}
