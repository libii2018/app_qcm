import { Quiz, QuizQuestion, ReviewState, AnswerEvent, QuizStats, SessionQuestion, UserSettings, BackupData } from '@qcm/shared';
import { ApiResponse, ApiError, AuthCredentials, AuthResponse, User, QuizWithId, QuizListResponse, QuizFilter, MediaResponse, AnswerSubmission, AnswerResponse, StatsFilter, TodaySession, BackupResponse } from '../types/api';

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
    return this.fetchWithAuth<ApiResponse<QuizListResponse>>(`/quizzes?${query.toString()}`)
      .then(r => r.data);
  }

  async getQuizById(id: string): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<QuizWithId>>(`/quizzes/${id}`).then(r => r.data);
  }

  async createQuiz(quiz: Omit<Quiz, 'id'>): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<QuizWithId>>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quiz),
    }).then(r => r.data);
  }

  async updateQuiz(id: string, quiz: Partial<Quiz>): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<QuizWithId>>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quiz),
    }).then(r => r.data);
  }

  async deleteQuiz(id: string): Promise<void> {
    await this.fetchWithAuth(`/quizzes/${id}`, { method: 'DELETE' });
  }

  async duplicateQuiz(id: string): Promise<QuizWithId> {
    return this.fetchWithAuth<ApiResponse<QuizWithId>>(`/quizzes/${id}/duplicate`, {
      method: 'POST',
    }).then(r => r.data);
  }

  async importQuiz(file: File, isZip: boolean = false): Promise<QuizWithId> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isZip', isZip.toString());
    
    return this.fetchWithAuth<ApiResponse<QuizWithId>>('/quizzes/import', {
      method: 'POST',
      body: formData,
    }).then(r => r.data);
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
  async submitAnswer(submission: AnswerSubmission): Promise<AnswerResponse> {
    return this.fetchWithAuth<ApiResponse<AnswerResponse>>('/answers', {
      method: 'POST',
      body: JSON.stringify(submission),
    }).then(r => r.data);
  }

  async submitAnswers(submissions: AnswerSubmission[]): Promise<AnswerResponse[]> {
    return this.fetchWithAuth<ApiResponse<AnswerResponse[]>>('/answers/batch', {
      method: 'POST',
      body: JSON.stringify(submissions),
    }).then(r => r.data);
  }

  // Stats
  async getStats(filter?: StatsFilter): Promise<QuizStats> {
    const query = new URLSearchParams();
    if (filter) {
      if (filter.from) query.append('from', filter.from);
      if (filter.to) query.append('to', filter.to);
      if (filter.subject) query.append('subject', filter.subject);
      if (filter.tag) query.append('tag', filter.tag);
    }
    return this.fetchWithAuth<ApiResponse<QuizStats>>(`/stats?${query.toString()}`)
      .then(r => r.data);
  }

  // Today
  async getTodaySession(): Promise<TodaySession> {
    return this.fetchWithAuth<ApiResponse<TodaySession>>('/today').then(r => r.data);
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

export const apiClient = new ApiClient();
