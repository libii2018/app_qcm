import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  streak: number;
  dailyGoal: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Appel API pour obtenir l'utilisateur connecté
async function fetchCurrentUser() {
  const response = await fetch('/api/auth/me');
  
  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error('Erreur lors de la récupération de l\'utilisateur');
  }

  return response.json();
}

// Appel API pour la connexion
async function loginUser(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de la connexion');
  }

  return response.json();
}

// Appel API pour l'inscription
async function registerUser(email: string, password: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de l\'inscription');
  }

  return response.json();
}

// Appel API pour la déconnexion
async function logoutUser() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la déconnexion');
  }

  return response.json();
}

// Appel API pour la mise à jour du profil
async function updateUserProfile(data: any) {
  const response = await fetch('/api/auth/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de la mise à jour du profil');
  }

  return response.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Vérifier l'authentification au montage
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialiser l'état
  useEffect(() => {
    if (data) {
      setUser(data.data.user);
    }
  }, [data]);

  // Mutation pour la connexion
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => loginUser(email, password),
    onSuccess: async (result) => {
      setUser(result.data.user);
      setToken(result.data.token);
      await refetch();
      navigate('/');
      toast.success('Connexion réussie !');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation pour l'inscription
  const registerMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => registerUser(email, password),
    onSuccess: async (result) => {
      setUser(result.data.user);
      setToken(result.data.token);
      await refetch();
      navigate('/');
      toast.success('Inscription réussie !');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation pour la déconnexion
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      setUser(null);
      setToken(null);
      queryClient.clear();
      navigate('/login');
      toast.success('Déconnexion réussie');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation pour la mise à jour du profil
  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (result) => {
      setUser(result.data.user);
      toast.success('Profil mis à jour');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Fonction de connexion
  const login = useCallback(async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  // Fonction d'inscription
  const register = useCallback(async (email: string, password: string) => {
    await registerMutation.mutateAsync({ email, password });
  }, [registerMutation]);

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Fonction de mise à jour du profil
  const updateProfile = useCallback(async (data: any) => {
    await updateProfileMutation.mutateAsync(data);
  }, [updateProfileMutation]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    token,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
