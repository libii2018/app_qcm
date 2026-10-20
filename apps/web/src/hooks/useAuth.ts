import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { AuthCredentials, User } from '../types/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get token from localStorage and validate
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.setToken(token);
      apiClient.getMe()
        .then((user) => setUser(user))
        .catch(() => {
          localStorage.removeItem('token');
          apiClient.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.login(credentials);
      localStorage.setItem('token', response.token);
      apiClient.setToken(response.token);
      setUser(response.user);
      return response.user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: AuthCredentials) => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.register(credentials);
      localStorage.setItem('token', response.token);
      apiClient.setToken(response.token);
      setUser(response.user);
      return response.user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'inscription');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await apiClient.logout();
      localStorage.removeItem('token');
      apiClient.setToken(null);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}
