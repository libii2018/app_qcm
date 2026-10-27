import { useMutation } from '@tanstack/react-query';
import { QuizSession } from '@qcm/shared';
import { apiClient, AnswerSubmissionPayload } from '../lib/apiClient';
import { AnswerResponse } from '../types/api';

export function useSubmitAnswer() {
  return useMutation<AnswerResponse, Error, AnswerSubmissionPayload>({
    mutationFn: (submission) => apiClient.submitAnswer(submission),
  });
}

export function useSubmitAnswers() {
  return useMutation<void, Error, QuizSession>({
    mutationFn: (session) => apiClient.submitSession(session),
  });
}
