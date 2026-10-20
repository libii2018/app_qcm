import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { AnswerSubmission, AnswerResponse } from '../types/api';

export function useSubmitAnswer() {
  return useMutation<AnswerResponse, Error, AnswerSubmission>({
    mutationFn: (submission) => apiClient.submitAnswer(submission),
  });
}

export function useSubmitAnswers() {
  return useMutation<AnswerResponse[], Error, AnswerSubmission[]>({
    mutationFn: (submissions) => apiClient.submitAnswers(submissions),
  });
}
