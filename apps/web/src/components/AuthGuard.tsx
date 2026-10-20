import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from './Layout';

interface AuthGuardProps {
  children?: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Si on est en train de charger, afficher un état de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-primary animate-spin" />
          </div>
          <p className="text-text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si non authentifié, rediriger vers la page de connexion
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si authentifié, afficher les enfants ou le Layout par défaut
  return children ? <>{children}</> : <Outlet />;
}
