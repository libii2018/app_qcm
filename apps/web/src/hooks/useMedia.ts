import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { MediaResponse } from '../types/api';

export function useUploadMedia() {
  const queryClient = useQueryClient();
  
  return useMutation<MediaResponse, Error, { file: File; altText?: string }>({
    mutationFn: ({ file, altText }) => apiClient.uploadMedia(file, altText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useMediaStream() {
  return async (id: string): Promise<string> => {
    try {
      return await apiClient.getMediaStream(id);
    } catch (error) {
      console.error('Failed to get media stream:', error);
      throw error;
    }
  };
}
