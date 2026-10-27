import { QuizJson, ReviewState, AnswerEvent, QuizSession } from '@qcm/shared';
import { ApiResponse, ApiError, AuthCredentials, AuthResponse, User, QuizWithId, QuizListResponse, QuizFilter, MediaResponse, AnswerResponse, StatsFilter, TodaySession, BackupResponse, QuizStats, UserSettings, DailyStatsEntry, FailedQuestionEntry } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (this.token) {
      headers.append('Authorization', `Bearer ${this.token}`);
    }
    
    if (options.body && !(options.body instanceof FormData)) {
      headers.append('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ 
        error: { 
          code: 'UNKNOWN_ERROR', 
          message: 'Une erreur est survenue' 
        } 
      }));
      throw new Error(error.error.message || 'Erreur API');
    }

    return response.json();
  }

  // Auth
  async register(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.fetchWithAuth<ApiResponse<AuthResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }).then(r => r.data);
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.fetchWithAuth<ApiResponse<AuthResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }).then(r => r.data);
  }

  async logout(): Promise<void> {
    await this.fetchWithAuth('/auth/logout', { method: 'POST' });
    this.token = null;
  }

  async getMe(): Promise<User> {
    return this.fetchWithAuth<ApiResponse<User>>('/auth/me').then(r => r.data);
  }

  // Quizzes
  async getQuizzes(filter?: QuizFilter): Promise<QuizListResponse> {
    const query = new URLSearchParams();
    if (filter) {
      if (filter.subject) query.append('subject', filter.subject);
      if (filter.search) query.append('search', filter.search);
      if (filter.difficulty) query.append('difficulty', filter.difficulty.toString());
      if (filter.tags) filter.tags.forEach(t => query.append('tags', t));
      if (filter.page) query.append('page', filter.page.toString());
      if (filter.pageSize) query.append('pageSize', filter.pageSize.toString());
    }
    return this.fetchWithAuth<ApiResponse<{ quizzes: QuizWithId[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(`/quizzes?${query.toString()}`)
      .then(r => ({
        quizzes: r.data.quizzes,
        total: r.data.pagination.total,
        page: r.data.pagination.page,
        pageSize: r.data.pagination.pageSize,
      }));
  }

  async getQuizById(id: string): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<{ quiz: QuizWithId }>>(`/quizzes/${id}`).then(r => r.data.quiz);
  }

  // L'API attend directement le QuizJson en body (validé par validateQuizJson)
  async createQuiz(quiz: QuizJson): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<{ quiz: QuizWithId }>>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quiz),
    }).then(r => r.data.quiz);
  }

  async updateQuiz(id: string, quiz: QuizJson): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<{ quiz: QuizWithId }>>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quiz),
    }).then(r => r.data.quiz);
  }

  async deleteQuiz(id: string): Promise<void> {
    await this.fetchWithAuth(`/quizzes/${id}`, { method: 'DELETE' });
  }

  async duplicateQuiz(id: string): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<{ quiz: QuizWithId }>>(`/quizzes/${id}/duplicate`, {
      method: 'POST',
    }).then(r => r.data.quiz);
  }

  async importQuiz(file: File, isZip: boolean = false): Promise<QuizWithId> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isZip', isZip.toString());
    
    return this.fetchWithAuth<ApiResponse<{ quiz: QuizWithId }>>('/quizzes/import', {
      method: 'POST',
      body: formData,
    }).then(r => r.data.quiz);
  }

  async exportQuiz(id: string, asZip: boolean = false): Promise<Blob> {
    const endpoint = asZip ? `/quizzes/${id}/export?format=zip` : `/quizzes/${id}/export`;
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  }

  // Media
  async uploadMedia(file: File, altText?: string): Promise<MediaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) formData.append('altText', altText);
    
    return this.fetchWithAuth<ApiResponse<MediaResponse>>('/media', {
      method: 'POST',
      body: formData,
    }).then(r => r.data);
  }

  async deleteMedia(id: string): Promise<void> {
    await this.fetchWithAuth(`/media/${id}`, { method: 'DELETE' });
  }

  async getMediaStream(id: string): Promise<string> {
    const response = await fetch(`${API_BASE}/media/${id}`, {
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Media not found');
    }
    
    return URL.createObjectURL(await response.blob());
  }

  // Answers
  async submitAnswer(submission: AnswerSubmissionPayload): Promise<AnswerResponse> {
    return this.fetchWithAuth<ApiResponse<{ answerEvent: AnswerResponse }>>('/answers', {
      method: 'POST',
      body: JSON.stringify(submission),
    }).then(r => r.data.answerEvent);
  }

  async submitSession(session: QuizSession): Promise<void> {
    await this.fetchWithAuth('/answers/session', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  // Stats
  // Agrège les endpoints granulaires de /api/stats/* dans la forme attendue par la page Stats
  async getStats(filter?: StatsFilter): Promise<QuizStats> {
    const query = new URLSearchParams();
    if (filter) {
      if (filter.from) query.append('from', filter.from);
      if (filter.to) query.append('to', filter.to);
      if (filter.subject) query.append('subject', filter.subject);
      if (filter.tag) query.append('tag', filter.tag);
    }
    const qs = query.toString();
    const suffix = qs ? `?${qs}` : '';

    const overviewResp = await this.fetchWithAuth<ApiResponse<{
      overview: {
        quizCount: number;
        answerCount: number;
        correctCount: number;
        incorrectCount: number;
        successRate: number; // 0-100
        streak: number;
        dailyGoal: number;
      };
    }>>(`/stats${suffix}`);
    const overview = overviewResp.data.overview;

    const [perfResp, dailyResp, subjectsResp, tagsResp, learningResp, failedResp] = await Promise.all([
      this.fetchWithAuth<ApiResponse<{ stats: { avgResponseTime: number } }>>(`/stats/performance${suffix}`).catch(() => null),
      this.fetchWithAuth<ApiResponse<{ stats: Array<{ date: string; questionsAnswered: number; correctCount: number; successRate: number; responseTime: number }> }>>(`/stats/daily${suffix}`).catch(() => null),
      this.fetchWithAuth<ApiResponse<{ stats: Array<{ subject: string; totalQuestions: number; successRate: number }> }>>(`/stats/subjects${suffix}`).catch(() => null),
      this.fetchWithAuth<ApiResponse<{ stats: Array<{ tag: string; totalQuestions: number; successRate: number }> }>>(`/stats/tags${suffix}`).catch(() => null),
      this.fetchWithAuth<ApiResponse<{ learningStats: { newQuestions: number; learningQuestions: number; masteredQuestions: number; forecast: Array<{ date: string; estimatedQuestions: number }> } }>>(`/stats/learning`).catch(() => null),
      this.fetchWithAuth<ApiResponse<{ failedQuestions: Array<{ questionId: string; quizId?: string; title: string; totalAttempts: number; successRate: number }> }>>(`/stats/failed-questions${suffix}&limit=10`).catch(() => null),
    ]);

    const daily: DailyStatsEntry[] = (dailyResp?.data.stats || []).map(d => ({
      date: d.date,
      totalAnswers: d.questionsAnswered,
      correctAnswers: d.correctCount,
      successRate: d.successRate / 100,
      averageTime: d.responseTime,
    }));

    const bySubject: QuizStats['bySubject'] = {};
    (subjectsResp?.data.stats || []).forEach(s => {
      bySubject[s.subject] = { successRate: s.successRate / 100, totalAnswers: s.totalQuestions };
    });

    const byTag: QuizStats['byTag'] = {};
    (tagsResp?.data.stats || []).forEach(t => {
      byTag[t.tag] = { successRate: t.successRate / 100, totalAnswers: t.totalQuestions };
    });

    const learning = learningResp?.data.learningStats;
    const mostFailedQuestions: FailedQuestionEntry[] = (failedResp?.data.failedQuestions || []).map(f => ({
      questionId: f.questionId,
      questionText: f.title,
      quizTitle: f.quizId || '',
      failureRate: 1 - f.successRate / 100,
      totalAttempts: f.totalAttempts,
    }));

    return {
      totalAnswers: overview.answerCount,
      correctAnswers: overview.correctCount,
      successRate: overview.successRate / 100,
      bySubject,
      byTag,
      byDifficulty: {},
      dailyStats: daily,
      mostFailedQuestions,
      reviewDistribution: learning
        ? { new: learning.newQuestions, learning: learning.learningQuestions, mastered: learning.masteredQuestions }
        : { new: 0, learning: 0, mastered: 0 },
      streak: overview.streak,
      forecast: (learning?.forecast || []).map(f => ({ date: f.date, count: f.estimatedQuestions })),
    };
  }

  // Today
  async getTodaySession(): Promise<TodaySession> {
    return this.fetchWithAuth<ApiResponse<{
      session: {
        questions: TodaySession['questions'];
        totalQuestions: number;
        newQuestionsCount: number;
        reviewQuestionsCount: number;
      };
      counts: { dueToday: number; newQuestions: number; totalToReview: number };
      streak: number;
      dailyGoal: number;
    }>>('/today').then(r => ({
      questions: r.data.session.questions,
      totalCount: r.data.session.totalQuestions,
      reasonSummary: [...new Set(r.data.session.questions.map(q => q.reason))].join(', '),
    }));
  }

  // Backup
  async createBackup(): Promise<BackupResponse> {
    return this.fetchWithAuth<ApiResponse<BackupResponse>>('/backup', {
      method: 'POST',
    }).then(r => r.data);
  }

  async restoreBackup(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    
    await this.fetchWithAuth('/backup/restore', {
      method: 'POST',
      body: formData,
    });
  }

  async downloadBackup(): Promise<Blob> {
    const response = await fetch(`${API_BASE}/backup`, {
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Backup download failed');
    }
    
    return response.blob();
  }

  // Settings
  async getSettings(): Promise<UserSettings> {
    return this.fetchWithAuth<ApiResponse<UserSettings>>('/settings').then(r => r.data);
  }

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    return this.fetchWithAuth<ApiResponse<UserSettings>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }).then(r => r.data);
  }

  // Review States
  async getReviewStates(): Promise<ReviewState[]> {
    return this.fetchWithAuth<ApiResponse<ReviewState[]>>('/review-states').then(r => r.data);
  }

  async updateReviewState(quizId: string, questionId: string, state: Partial<ReviewState>): Promise<ReviewState> {
    return this.fetchWithAuth<ApiResponse<ReviewState>>(`/review-states/${quizId}/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(state),
    }).then(r => r.data);
  }

  // Health
  async healthCheck(): Promise<{ status: string }> {
    return this.fetchWithAuth<ApiResponse<{ status: string }>>('/health').then(r => r.data);
  }
}

// Payload d'une réponse individuelle (POST /api/answers, schéma AnswerEventSchema)
export interface AnswerSubmissionPayload {
  questionId: string;
  quizId?: string;
  selectedOptions: string[];
  correct: boolean;
  responseTime: number;
  usedHint: boolean;
  timestamp?: string;
}

export const apiClient = new ApiClient();
