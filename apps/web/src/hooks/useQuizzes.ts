import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { QuizWithId, QuizListResponse, QuizFilter } from '../types/api';
import { Quiz } from '@qcm/shared';

export function useQuizzes(filter?: QuizFilter) {
  return useQuery<QuizListResponse, Error>({
    queryKey: ['quizzes', filter],
    queryFn: () => apiClient.getQuizzes(filter),
  });
}

export function useQuiz(id: string) {
  return useQuery<QuizWithId, Error>({
    queryKey: ['quiz', id],
    queryFn: () => apiClient.getQuizById(id),
    enabled: !!id,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation<QuizWithId, Error, Omit<Quiz, 'id'>>({
    mutationFn: (quiz) => apiClient.createQuiz(quiz),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation<QuizWithId, Error, { id: string; quiz: Partial<Quiz> }>({
    mutationFn: ({ id, quiz }) => apiClient.updateQuiz(id, quiz),
    onSuccess: (data) => {
      queryClient.setQueryData(['quiz', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.deleteQuiz(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['quiz', id] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useDuplicateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation<QuizWithId, Error, string>({
    mutationFn: (id) => apiClient.duplicateQuiz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useImportQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation<QuizWithId, Error, { file: File; isZip: boolean }>({
    mutationFn: ({ file, isZip }) => apiClient.importQuiz(file, isZip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useExportQuiz() {
  return useMutation<Blob, Error, { id: string; asZip: boolean }>({
    mutationFn: ({ id, asZip }) => apiClient.exportQuiz(id, asZip),
  });
}
