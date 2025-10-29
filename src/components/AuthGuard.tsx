import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'operacional' | 'gestor' | 'admin';
}

const roleHierarchy = {
  operacional: 1,
  gestor: 2,
  admin: 3
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return null; // Will be handled by AppLayout showing login
  }

  if (requiredRole) {
    const userRoleLevel = roleHierarchy[profile.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="p-8">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acesso Negado</AlertTitle>
            <AlertDescription>
              Você não tem permissão para acessar esta funcionalidade. 
              Necessário: {requiredRole}. Seu nível: {profile.role}.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
  }

  return <>{children}</>;
};
